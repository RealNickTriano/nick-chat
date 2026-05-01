package dev.nicktriano.model_selector_demo.chat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.openai.OpenAiChatModel;

@Service
public class TitleGenerationService {

  private final ChatModel model;

  public TitleGenerationService(
      @Value("${app.title-generation.openai-api-key}") String apiKey,
      @Value("${app.title-generation.model:gpt-4o-mini}") String modelName
  ) {
    this.model = OpenAiChatModel.builder()
        .apiKey(apiKey)
        .modelName(modelName)
        .build();
  }

  public String generateTitle(String firstUserMessage) {
    String systemPrompt = """
      Generate a short (max 6 words) title summarizing this conversation. Reply with only the title, no quotes.
      
      Do not reference specific LLM models unless the conversation is talking about them.
    """;
    ChatRequest request = ChatRequest.builder()
        .messages(SystemMessage.from(systemPrompt), UserMessage.from(firstUserMessage))
        .build();
    ChatResponse response = model.chat(request);
    return response.aiMessage().text().trim();
  }
}
