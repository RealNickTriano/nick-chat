package dev.nicktriano.model_selector_demo.model;

import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.anthropic.AnthropicStreamingChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.nicktriano.model_selector_demo.chat.ChatValidationException;

public class StreamingChatModelBuilder {
  private String apiKey;
  private String modelName;
  private ModelProvider provider;

  private StreamingChatModelBuilder() {}

  public static StreamingChatModelBuilder builder() {
    return new StreamingChatModelBuilder();
  }

  public StreamingChatModelBuilder apiKey(String apiKey) {
    this.apiKey = apiKey;
    return this;
  }

  public StreamingChatModelBuilder modelName(String modelName) {
    this.modelName = modelName;
    return this;
  }

  public StreamingChatModelBuilder provider(ModelProvider provider) {
    this.provider = provider;
    return this;
  }

  public StreamingChatModel build() {
    return switch (this.provider) {
      case OPEN_AI -> OpenAiStreamingChatModel.builder()
        .apiKey(this.apiKey)
        .modelName(this.modelName)
        .build();
      case ANTHROPIC -> AnthropicStreamingChatModel.builder()
        .apiKey(this.apiKey)
        .modelName(this.modelName)
        .build();
      default -> throw new ChatValidationException("Unsupported provider: " + provider);
    };
  }
}
