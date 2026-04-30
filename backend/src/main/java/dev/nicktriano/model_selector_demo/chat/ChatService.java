package dev.nicktriano.model_selector_demo.chat;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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

  public ChatService(
    ChatRepository chatRepository,
    MessageRepository messageRepository,
    ModelSelectorService catalogs,
    ApiKeyService apiKeyService
  ) {
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.catalogs = catalogs;
    this.apiKeyService = apiKeyService;
  }

  public ChatEntity newChat(UUID userId) {
    return chatRepository.save(new ChatEntity(userId));
  }

  public ResolvedRequest validate(ApplicationChatRequest request) {
    ModelProvider provider = resolveProvider(request.provider());
    requireKnownModel(provider, request.model());
    List<ChatMessage> lcMessages = List.of(UserMessage.from(request.content()));
    return new ResolvedRequest(provider, request.model(), lcMessages);
  }

  public void stream(ResolvedRequest resolved, UUID chatId, UUID userId, SseEmitter emitter) {
    StreamingChatModel model = buildStreamingModel(resolved.provider(), resolved.model(), userId);
    ChatRequest lcRequest = ChatRequest.builder().messages(resolved.messages()).build();

    send(emitter, "chat_created", Map.of("chatId", chatId.toString()));

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

  private StreamingChatModel buildStreamingModel(ModelProvider provider, String model, UUID userId) {
    String key = apiKeyService.getDecryptedKey(userId, provider.name());

    return StreamingChatModelBuilder.builder()
      .apiKey(key)
      .provider(provider)
      .modelName(model)
      .build();
  }


  public record ResolvedRequest(ModelProvider provider, String model, List<ChatMessage> messages) {}

  private static void send(SseEmitter emitter, String name, Map<String, ?> data) {
    try {
      emitter.send(SseEmitter.event().name(name).data(data));
    } catch (IOException e) {
      emitter.completeWithError(e);
    }
  }
}
