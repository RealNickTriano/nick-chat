package dev.nicktriano.model_selector_demo.chat;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.nicktriano.model_selector_demo.apikey.ApiKeyService;
import dev.nicktriano.model_selector_demo.model.StreamingChatModelBuilder;
import dev.nicktriano.model_selector_demo.model_selector.ModelSelectorService;

@Service
public class ChatService {

  private static final Logger logger = Logger.getLogger(ChatService.class.getName());

  private ChatRepository chatRepository;
  private MessageRepository messageRepository;

  private final ModelSelectorService catalogs;
  private final ApiKeyService apiKeyService;
  private final TitleGenerationService titleGenerationService;

  public ChatService(
    ChatRepository chatRepository,
    MessageRepository messageRepository,
    ModelSelectorService catalogs,
    ApiKeyService apiKeyService,
    TitleGenerationService titleGenerationService
  ) {
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.catalogs = catalogs;
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

  public ResolvedRequest validate(ApplicationChatRequest request) {
    ModelProvider provider = resolveProvider(request.provider());
    requireKnownModel(provider, request.model());
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

    model.chat(lcRequest, new StreamingChatResponseHandler() {
      @Override
      public void onPartialResponse(String partial) {
        send(emitter, "token", Map.of("text", partial));
      }

      @Override
      public void onCompleteResponse(ChatResponse response) {
        MessageEntity saved = messageRepository.save(new MessageEntity(
          chatId,
          "assistant",
          response.aiMessage().text(),
          resolved.provider().name(),
          resolved.model()
        ));
        send(emitter, "done", Map.of("messageId", saved.getId().toString(), "finishReason", "stop"));

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
      if (resolved == ModelProvider.OPEN_AI || resolved == ModelProvider.ANTHROPIC) {
        return resolved;
      }
    } catch (IllegalArgumentException ignored) {
      // falls through to the unsupported-provider error below
    }
    throw new ChatValidationException("Unsupported provider: " + provider);
  }

  private void requireKnownModel(ModelProvider provider, String model) {
    if (model == null || model.isBlank()) {
      throw new ChatValidationException("Missing model");
    }
    List<ModelDescription> catalog = switch (provider) {
      case OPEN_AI -> catalogs.getOpenAiModels();
      case ANTHROPIC -> catalogs.getAnthropicModels();
      default -> throw new ChatValidationException("Unsupported provider: " + provider);
    };
    boolean found = catalog.stream().anyMatch(m -> model.equals(m.name()));
    if (!found) {
      throw new ChatValidationException("Unknown model for " + provider + ": " + model);
    }
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
