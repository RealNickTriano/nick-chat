package dev.nicktriano.model_selector_demo.chat;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.output.TokenUsage;
import dev.nicktriano.model_selector_demo.apikey.ApiKeyService;
import dev.nicktriano.model_selector_demo.model.StreamingChatModelBuilder;

@Service
public class ChatService {

  private static final Logger logger = Logger.getLogger(ChatService.class.getName());

  private ChatRepository chatRepository;
  private MessageRepository messageRepository;

  private final ApiKeyService apiKeyService;
  private final TitleGenerationService titleGenerationService;

  public ChatService(
    ChatRepository chatRepository,
    MessageRepository messageRepository,
    ApiKeyService apiKeyService,
    TitleGenerationService titleGenerationService
  ) {
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.apiKeyService = apiKeyService;
    this.titleGenerationService = titleGenerationService;
  }

  public ChatEntity newChat(UUID userId) {
    return chatRepository.save(new ChatEntity(userId));
  }

  public List<ChatSummary> getChats(UUID userId) {
    return chatRepository.findByUserIdOrderByUpdatedAtDesc(userId, Pageable.unpaged())
        .stream()
        .map(c -> new ChatSummary(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt()))
        .toList();
  }

  public ChatEntity getChat(UUID chatId, UUID userId) {
    return chatRepository.findByIdAndUserId(chatId, userId)
        .orElseThrow(ChatNotFoundException::new);
  }

  public List<MessageSummary> getMessages(UUID chatId, UUID userId) {
    getChat(chatId, userId);
    return messageRepository.findByChatIdOrderByCreatedAtAsc(chatId)
        .stream()
        .map(m -> new MessageSummary(m.getId(), m.getRole(), m.getProvider(), m.getModel(), m.getContent(), m.getCreatedAt(),
            m.getInputTokens(), m.getOutputTokens(), m.getTotalTokens(),
            m.getFinishReason(), m.getResponseId(),
            m.getLatencyMs(), m.getTtftMs(), m.getResolvedModel()))
        .toList();
  }

  public ResolvedRequest validate(ApplicationChatRequest request) {
    ModelProvider provider = resolveProvider(request.provider());
    return new ResolvedRequest(provider, request.model());
  }

  public void stream(ResolvedRequest resolved, ChatEntity chat, String content, UUID userId, SseEmitter emitter) {
    UUID chatId = chat.getId();
    StreamingChatModel model = buildStreamingModel(resolved.provider(), resolved.model(), userId);

    List<MessageEntity> history = messageRepository.findByChatIdOrderByCreatedAtAsc(chatId);
    List<ChatMessage> lcMessages = new ArrayList<>();
    for (MessageEntity m : history) {
      if ("user".equals(m.getRole())) lcMessages.add(UserMessage.from(m.getContent()));
      else if ("assistant".equals(m.getRole())) lcMessages.add(new AiMessage(m.getContent()));
    }

    ChatRequest lcRequest = ChatRequest.builder().messages(lcMessages).build();

    send(emitter, "chat_created", Map.of("chatId", chatId.toString()));

    CompletableFuture<Void> titleFuture = chat.getTitle() == null
        ? startTitleGeneration(content, chat, emitter)
        : CompletableFuture.completedFuture(null);

    long startMs = System.currentTimeMillis();
    AtomicLong firstTokenMs = new AtomicLong(-1);

    model.chat(lcRequest, new StreamingChatResponseHandler() {
      @Override
      public void onPartialResponse(String partial) {
        firstTokenMs.compareAndSet(-1, System.currentTimeMillis());
        send(emitter, "token", Map.of("text", partial));
      }

      @Override
      public void onCompleteResponse(ChatResponse response) {
        long endMs = System.currentTimeMillis();
        TokenUsage usage = response.tokenUsage();
        long ttft = firstTokenMs.get();
        MessageEntity saved = messageRepository.save(new MessageEntity(
          chatId,
          "assistant",
          response.aiMessage().text(),
          resolved.provider().name(),
          resolved.model(),
          usage != null ? usage.inputTokenCount()  : null,
          usage != null ? usage.outputTokenCount() : null,
          usage != null ? usage.totalTokenCount()  : null,
          response.finishReason() != null ? response.finishReason().name() : null,
          response.id(),
          (int) (endMs - startMs),
          ttft >= 0 ? (int) (ttft - startMs) : null,
          response.modelName()
        ));
        String finishReason = saved.getFinishReason() != null ? saved.getFinishReason() : "UNKNOWN";
        send(emitter, "done", Map.of("messageId", saved.getId().toString(), "finishReason", finishReason));

        try {
          titleFuture.get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
          logger.log(Level.WARNING, "Title generation timed out", e);
        }

        emitter.complete();
      }

      @Override
      public void onError(Throwable error) {
        logger.log(Level.WARNING, "Provider stream failed", error);
        String message = error.getMessage() != null ? error.getMessage() : error.getClass().getSimpleName();
        send(emitter, "error", Map.of("message", message, "code", "PROVIDER_ERROR"));
        emitter.complete();
      }
    });
  }

  private ModelProvider resolveProvider(String provider) {
    if (provider == null || provider.isBlank()) {
      throw new ChatValidationException("Missing provider");
    }
    try {
      ModelProvider resolved = ModelProvider.valueOf(provider);
      if (resolved == ModelProvider.OPEN_AI || resolved == ModelProvider.ANTHROPIC ||
          resolved == ModelProvider.GOOGLE_AI_GEMINI || resolved == ModelProvider.MISTRAL_AI) {
        return resolved;
      }
    } catch (IllegalArgumentException ignored) {
      // falls through to the unsupported-provider error below
    }
    throw new ChatValidationException("Unsupported provider: " + provider);
  }

  private CompletableFuture<Void> startTitleGeneration(String content, ChatEntity chat, SseEmitter emitter) {
    CompletableFuture<Void> future = new CompletableFuture<>();
    Thread.ofVirtual().start(() -> {
      try {
        String title = titleGenerationService.generateTitle(content);
        chat.setTitle(title);
        chatRepository.save(chat);
        send(emitter, "title", Map.of("title", title));
      } catch (Exception e) {
        logger.log(Level.WARNING, "Title generation failed", e);
      } finally {
        future.complete(null);
      }
    });
    return future;
  }

  private StreamingChatModel buildStreamingModel(ModelProvider provider, String model, UUID userId) {
    String key = apiKeyService.getDecryptedKey(userId, provider.name());

    return StreamingChatModelBuilder.builder()
      .apiKey(key)
      .provider(provider)
      .modelName(model)
      .build();
  }


  public record ResolvedRequest(ModelProvider provider, String model) {}

  public record MessageSummary(
      UUID id, String role, String provider, String model, String content, Instant createdAt,
      Integer inputTokens, Integer outputTokens, Integer totalTokens,
      String finishReason, String responseId,
      Integer latencyMs, Integer ttftMs, String resolvedModel) {}

  private static void send(SseEmitter emitter, String name, Map<String, ?> data) {
    try {
      emitter.send(SseEmitter.event().name(name).data(data));
    } catch (IOException e) {
      emitter.completeWithError(e);
    } catch (IllegalStateException ignored) {
      // emitter already closed (e.g. error path fired before title thread finished)
    }
  }
}
