package dev.nicktriano.model_selector_demo.chat;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.anthropic.AnthropicStreamingChatModel;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.nicktriano.model_selector_demo.model.StreamingChatModelBuilder;
import dev.nicktriano.model_selector_demo.model.StreamingModel;
import dev.nicktriano.model_selector_demo.model_selector.ModelSelectorService;

@Service
public class ChatService {

  private static final Logger logger = Logger.getLogger(ChatService.class.getName());

  private final ModelSelectorService catalogs;
  private final String openAiApiKey;
  private final String anthropicApiKey;

  public ChatService(
    ModelSelectorService catalogs,
    @Value("${app.openai.key}") String openAiApiKey,
    @Value("${app.anthropic.key}") String anthropicApiKey
  ) {
    this.catalogs = catalogs;
    this.openAiApiKey = openAiApiKey;
    this.anthropicApiKey = anthropicApiKey;
  }

  public ResolvedRequest validate(ChatStreamRequest request) {
    ModelProvider provider = resolveProvider(request.provider());
    requireKnownModel(provider, request.model());
    List<ChatMessage> lcMessages = toLangchainMessages(request.messages());
    return new ResolvedRequest(provider, request.model(), lcMessages);
  }

  public void stream(ResolvedRequest resolved, SseEmitter emitter) {
    StreamingChatModel model = buildStreamingModel(resolved.provider(), resolved.model());
    ChatRequest lcRequest = ChatRequest.builder().messages(resolved.messages()).build();

    model.chat(lcRequest, new StreamingChatResponseHandler() {
      @Override
      public void onPartialResponse(String partial) {
        send(emitter, Map.of("type", "delta", "text", partial));
      }

      @Override
      public void onCompleteResponse(ChatResponse response) {
        send(emitter, Map.of("type", "done"));
        emitter.complete();
      }

      @Override
      public void onError(Throwable error) {
        logger.log(Level.WARNING, "Provider stream failed", error);
        String message = error.getMessage() != null ? error.getMessage() : error.getClass().getSimpleName();
        send(emitter, Map.of("type", "error", "message", message));
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

  private StreamingChatModel buildStreamingModel(ModelProvider provider, String model) {
    String key = switch (provider) {
      case OPEN_AI -> openAiApiKey;
      case ANTHROPIC -> anthropicApiKey;
      default -> throw new ChatValidationException("Unsupported provider: " + provider);
    };

    return StreamingChatModelBuilder.builder()
      .apiKey(key)
      .provider(provider)
      .modelName(model)
      .build();
  }

  private List<ChatMessage> toLangchainMessages(List<ChatStreamRequest.Message> messages) {
    if (messages == null || messages.isEmpty()) {
      throw new ChatValidationException("messages must not be empty");
    }
    List<ChatMessage> out = new ArrayList<>(messages.size());
    for (ChatStreamRequest.Message m : messages) {
      if (m.content() == null) {
        throw new ChatValidationException("message content must not be null");
      }
      String role = m.role() == null ? "" : m.role().toLowerCase();
      switch (role) {
        case "user" -> out.add(UserMessage.from(m.content()));
        case "assistant" -> out.add(new AiMessage(m.content()));
        default -> throw new ChatValidationException("Unsupported role: " + m.role());
      }
    }
    return out;
  }

  public record ResolvedRequest(ModelProvider provider, String model, List<ChatMessage> messages) {}

  private static void send(SseEmitter emitter, Map<String, ?> event) {
    try {
      emitter.send(SseEmitter.event().data(event));
    } catch (IOException e) {
      // Client disconnected or stream closed; abort the emitter so the provider handler stops.
      emitter.completeWithError(e);
    }
  }
}
