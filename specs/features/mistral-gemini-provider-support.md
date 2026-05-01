# Mistral & Gemini Provider Support

Add end-to-end support for `MISTRAL_AI` and `GOOGLE_AI_GEMINI` providers alongside the existing OpenAI and Anthropic integrations.

## Already in Place

- **Maven deps** — `langchain4j-google-ai-gemini` and `langchain4j-mistral-ai` are already in `pom.xml`
- **API key storage** — `ApiKeyService.SUPPORTED_PROVIDERS` already includes both providers; users can store keys today

## Required Changes

### 1. `model/StreamingChatModelBuilder.java`

Add two cases to the provider `switch`:

```java
case GOOGLE_AI_GEMINI -> GoogleAiGeminiStreamingChatModel.builder()
    .apiKey(this.apiKey)
    .modelName(this.modelName)
    .build();
case MISTRAL_AI -> MistralAiStreamingChatModel.builder()
    .apiKey(this.apiKey)
    .modelName(this.modelName)
    .build();
```

### 2. `models/ModelService.java`

**`CATALOG_PROVIDERS` list** — add both providers:
```java
ModelProvider.GOOGLE_AI_GEMINI,
ModelProvider.MISTRAL_AI
```

**Constructor** — inject keys via `@Value`:
```java
@Value("${app.google.key}") String googleKey,
@Value("${app.mistral.key}") String mistralKey
```

**`catalogFor()` switch** — add two cases:
```java
case GOOGLE_AI_GEMINI -> Optional.of(new GoogleAiGeminiModelCatalog.Builder()
    .apiKey(googleKey)
    .build());
case MISTRAL_AI -> Optional.of(new MistralAiModelCatalog.Builder()
    .apiKey(mistralKey)
    .build());
```

### 3. `chat/ChatService.java`

`resolveProvider()` has a whitelist that currently only allows `OPEN_AI` and `ANTHROPIC`. Expand it:

```java
if (resolved == ModelProvider.OPEN_AI ||
    resolved == ModelProvider.ANTHROPIC ||
    resolved == ModelProvider.GOOGLE_AI_GEMINI ||
    resolved == ModelProvider.MISTRAL_AI) {
    return resolved;
}
```

### 4. `resources/application.properties`

Add env-var-backed config entries:

```properties
app.google.key=${GOOGLE_API_KEY}
app.mistral.key=${MISTRAL_API_KEY}
```

## LangChain4j Class Reference

| Provider | `ModelProvider` enum | Streaming model class | Catalog class |
|---|---|---|---|
| OpenAI | `OPEN_AI` | `OpenAiStreamingChatModel` | `OpenAiModelCatalog` |
| Anthropic | `ANTHROPIC` | `AnthropicStreamingChatModel` | `AnthropicModelCatalog` |
| Google Gemini | `GOOGLE_AI_GEMINI` | `GoogleAiGeminiStreamingChatModel` | `GoogleAiGeminiModelCatalog` |
| Mistral | `MISTRAL_AI` | `MistralAiStreamingChatModel` | `MistralAiModelCatalog` |
