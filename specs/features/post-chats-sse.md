# `POST /chats` — New Chat with SSE Streaming

## Current State

A partial implementation exists under `POST /chat` (no `s`). It stores chats and messages, streams tokens via SSE, and validates the provider and model against the catalog. However several things are wrong or missing relative to the spec:

| Area | Current | Required |
|---|---|---|
| Path | `/chat` | `/chats` |
| Request shape | `{ provider, model, messages: [{role, content}] }` | `{ provider, model, content }` |
| API key source | Hardcoded `app.openai.key` / `app.anthropic.key` | User's stored key via `ApiKeyService.getDecryptedKey()` |
| SSE event format | JSON blob with `type` field | Named SSE events (`event: token`, etc.) |
| `chat_created` event | Missing | Required — client needs `chatId` before any tokens |
| Chat memory | Built from request `messages` array | Hydrated from DB on every request |
| Title generation | Missing | Async, after stream completes |
| Thread model | Inline on controller thread | Dedicated `ExecutorService` bean |
| `@Valid` on request | Missing | Required |

---

## Request

```
POST /chats
Content-Type: application/json
```

```json
{
  "provider": "ANTHROPIC",
  "model": "claude-opus-4-7",
  "content": "hello world"
}
```

### Validation (enforced by `@Valid` + bean validation)

| Field | Rule |
|---|---|
| `provider` | `@NotBlank` |
| `model` | `@NotBlank` |
| `content` | `@NotBlank`, `@Size(max = 100_000)` |

Additional runtime checks in `ChatService`:
- `provider` must resolve to a `ModelProvider` in `SUPPORTED_PROVIDERS` — `400` if not.
- `model` must appear in the provider's catalog — `400` if not.
- User must have a stored key for `provider` in `api_keys` — `400` with message `"No API key saved for provider: <provider>"` if not.

---

## SSE Event Sequence

**Content-Type:** `text/event-stream`

```
event: chat_created
data: {"chatId":"<uuid>"}

event: token
data: {"text":"Hello"}

event: token
data: {"text":", how"}

event: done
data: {"messageId":"<uuid>","finishReason":"stop"}

event: title
data: {"title":"Greeting exchange"}
```

If title generation fails the `title` event is not emitted. Clients must not depend on it arriving but should keep the connection open until they receive it or the stream closes.

If the provider errors mid-stream:
```
event: error
data: {"message":"<description>","code":"PROVIDER_ERROR"}
```

---

## Implementation

### 1. Rename request class and path

Rename `ChatStreamRequest` → `ChatRequest` (or update in place). Change the field from `List<Message> messages` to `String content`. Remove the inner `Message` record — it is no longer needed.

```java
public record ChatRequest(
    @NotBlank String provider,
    @NotBlank String model,
    @NotBlank @Size(max = 100_000) String content
) {}
```

Change the controller mapping from `@PostMapping("/chat")` to `@PostMapping(value = "/chats", produces = MediaType.TEXT_EVENT_STREAM_VALUE)` and add `@Valid` to the request body parameter.

### 2. Use user's stored API key

Inject `ApiKeyService` into `ChatService`. Replace the hardcoded key lookup in `buildStreamingModel` with:

```java
String apiKey = apiKeyService.getDecryptedKey(userId, provider.name());
```

`ApiKeyService.getDecryptedKey()` already throws `ResponseStatusException(404)` if no key is found — change the status to `400` and message to `"No API key saved for provider: <provider>"`. The chat endpoint treats a missing key as a client error (the user forgot to configure it), not a server-side resource-not-found.

> **Note:** `userId` must now be threaded all the way into `buildStreamingModel` — update `ResolvedRequest` or pass it separately.

### 3. Fix SSE event format

Replace the current bare JSON data sends:
```java
// current (wrong)
emitter.send(SseEmitter.event().data(Map.of("type", "delta", "text", partial)));
```

with named events:
```java
// correct
emitter.send(SseEmitter.event().name("token").data(Map.of("text", partial)));
emitter.send(SseEmitter.event().name("done").data(Map.of("messageId", id, "finishReason", "stop")));
emitter.send(SseEmitter.event().name("chat_created").data(Map.of("chatId", chatId)));
emitter.send(SseEmitter.event().name("error").data(Map.of("message", msg, "code", "PROVIDER_ERROR")));
```

### 4. Emit `chat_created` before streaming

After creating the `ChatEntity` and persisting the user `MessageEntity`, and **before** calling the provider, emit:

```java
emitter.send(SseEmitter.event().name("chat_created").data(Map.of("chatId", chatId.toString())));
```

The client needs the `chatId` immediately so it can update the URL and route the stream to the right chat.

### 5. Hydrate chat memory from DB

Replace the current approach (building messages from the request body) with a DB-backed memory hydration. In `ChatService.stream()`:

```java
List<MessageEntity> history = messageRepository.findByChatIdOrderByCreatedAtAsc(chatId);
List<ChatMessage> lcMessages = new ArrayList<>();
for (MessageEntity m : history) {
    if ("user".equals(m.getRole())) lcMessages.add(UserMessage.from(m.getContent()));
    else if ("assistant".equals(m.getRole())) lcMessages.add(new AiMessage(m.getContent()));
}
```

Then pass `lcMessages` as the memory when building the `ChatRequest`. For a brand-new chat this list contains exactly one user message (the one just persisted in step 4 of the behavior sequence).

> The chat memory cap (`maxMessages = 100`, configurable via `app.chat.memory-max-messages`) can be applied here using a subList if the history is longer.

### 6. Add `TitleGenerationService`

New Spring `@Service` in the `chat` package.

```java
@Service
public class TitleGenerationService {

    private final ChatLanguageModel model; // non-streaming

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
        String systemPrompt = "Generate a short (max 6 words) title summarizing this conversation. Reply with only the title, no quotes.";
        Response<AiMessage> response = model.generate(
            SystemMessage.from(systemPrompt),
            UserMessage.from(firstUserMessage)
        );
        return response.content().text().trim();
    }
}
```

Add to `application.properties`:
```properties
app.title-generation.openai-api-key=${TITLE_GENERATION_OPENAI_KEY}
app.title-generation.model=gpt-4o-mini
```

Add `TITLE_GENERATION_OPENAI_KEY` to `.env`.

### 7. Run title generation concurrently with the LLM stream

Because the title only depends on the first user message — which is known before the stream starts — title generation can be fired immediately as a `CompletableFuture`, in parallel with the LLM call. In `onCompleteResponse`, after emitting `done`, the future is already in-flight (or done) and can be joined with a short timeout.

Total latency becomes `max(LLM time, title time)` instead of `LLM time + title time`.

```java
// Before starting the provider stream:
CompletableFuture<String> titleFuture = new CompletableFuture<>();
Thread.ofVirtual().start(() -> {
    try {
        titleFuture.complete(titleGenerationService.generateTitle(firstUserMessage));
    } catch (Exception e) {
        titleFuture.completeExceptionally(e);
    }
});

// Then in onCompleteResponse:
.onCompleteResponse(response -> {
    // 1. Persist assistant message
    MessageEntity saved = messageRepository.save(new MessageEntity(...));

    // 2. Emit done
    emitter.send(SseEmitter.event().name("done").data(
        Map.of("messageId", saved.getId().toString(), "finishReason", "stop")
    ));

    // 3. Collect title (usually already done by now) and emit
    try {
        String title = titleFuture.get(10, TimeUnit.SECONDS);
        chat.setTitle(title);
        chatRepository.save(chat);
        emitter.send(SseEmitter.event().name("title").data(Map.of("title", title)));
    } catch (Exception e) {
        logger.log(Level.WARNING, "Title generation failed", e);
        titleFuture.cancel(true);
        // title stays null; no title event emitted
    }

    emitter.complete();
})
```

`firstUserMessage` is the `content` string from the request — pass it into `stream()` as a parameter. The `title` event is still guaranteed to arrive after `done`, preserving the client contract.

### 8. No executor needed — `spring.threads.virtual.enabled=true` handles it

`application.properties` already has `spring.threads.virtual.enabled=true`, which causes Spring Boot to configure Tomcat to serve every HTTP request on its own virtual thread. No `ExecutorService` bean or `ChatConfig` class is needed.

- Setup work (DB queries, memory hydration, `chat_created` event) runs inline on the controller's virtual thread — blocking on JDBC is cheap.
- `model.chat(request, handler)` is non-blocking; LangChain4j fires callbacks on its own internal threads and the controller thread returns immediately.
- Title generation uses `Thread.ofVirtual().start(...)` directly (see §7) — no pool required.

Remove `ChatConfig.java` from the package layout below.

---

## Error Handling Summary

| Condition | Response |
|---|---|
| Blank/missing field | `400` via `@Valid` (MethodArgumentNotValidException) |
| Unknown provider | `400` — "Unknown provider: X" |
| Unknown model | `400` — "Unknown model for X: Y" |
| No user key for provider | `400` — "No API key saved for provider: X" |
| Provider stream error | SSE `error` event, stream closes |
| Title generation failure | Silently skipped; `title` event not emitted |

---

## Package Layout After Changes

```
chat/
├── ChatController.java          (update: path, @Valid, inject service deps)
├── ChatService.java             (update: user key lookup, memory hydration, events, executor)
├── ChatRequest.java          (rename/rewrite from ChatStreamRequest)
├── TitleGenerationService.java  (new)
├── ChatEntity.java              (no change)
├── MessageEntity.java           (no change)
├── ChatRepository.java          (no change)
├── MessageRepository.java       (no change)
└── ChatValidationException.java (no change)
```

---

## Out of Scope (This Iteration)

- `POST /chats/{chatId}/messages` (§5.5) — tracked separately.
- Memory windowing beyond simple list hydration.
- Partial-response persistence on mid-stream error (currently saves nothing on error).
