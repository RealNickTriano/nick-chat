# Message Metadata

Persist token usage, finish reason, response ID, latency, and TTFT from the provider's `ChatResponse` into the `messages` table. This enables cost tracking, debugging, and surfacing latency/usage stats in the UI.

## Fields to Add

| Column | Type | Source | Nullable |
|---|---|---|---|
| `input_tokens` | `INTEGER` | `response.tokenUsage().inputTokenCount()` | yes — not all providers return it |
| `output_tokens` | `INTEGER` | `response.tokenUsage().outputTokenCount()` | yes |
| `total_tokens` | `INTEGER` | `response.tokenUsage().totalTokenCount()` | yes |
| `finish_reason` | `VARCHAR(20)` | `response.finishReason().name()` | yes — enum: `STOP`, `LENGTH`, `TOOL_EXECUTION`, `CONTENT_FILTER`, `OTHER` |
| `response_id` | `VARCHAR(255)` | `response.id()` | yes — provider-assigned response ID, useful for tracing |
| `latency_ms` | `INTEGER` | wall-clock ms from `model.chat()` call to `onCompleteResponse` | no — always measurable |
| `ttft_ms` | `INTEGER` | wall-clock ms from `model.chat()` call to first `onPartialResponse` | no — always measurable |
| `resolved_model` | `VARCHAR(255)` | `response.modelName()` — actual model used by provider | yes — may differ from `model` when using `-latest` aliases |

`thinking` (from `AiMessage.thinking()`) and raw `provider_attributes` are out of scope — experimental and unstructured.

## Changes

### 1. `db/migration/V5__add_message_metadata.sql`

```sql
ALTER TABLE messages
    ADD COLUMN input_tokens   INTEGER,
    ADD COLUMN output_tokens  INTEGER,
    ADD COLUMN total_tokens   INTEGER,
    ADD COLUMN finish_reason  VARCHAR(20),
    ADD COLUMN response_id    VARCHAR(255),
    ADD COLUMN latency_ms     INTEGER,
    ADD COLUMN ttft_ms        INTEGER,
    ADD COLUMN resolved_model VARCHAR(255);
```

### 2. `chat/MessageEntity.java`

Add eight nullable fields and update the constructor used by `ChatService`:

```java
private Integer inputTokens;
private Integer outputTokens;
private Integer totalTokens;
private String finishReason;
private String responseId;
private Integer latencyMs;
private Integer ttftMs;
private String resolvedModel;
```

Add a second constructor (or extend the existing one) that accepts these:

```java
public MessageEntity(UUID chatId, String role, String content, String provider, String model,
                     Integer inputTokens, Integer outputTokens, Integer totalTokens,
                     String finishReason, String responseId,
                     Integer latencyMs, Integer ttftMs, String resolvedModel) { ... }
```

### 3. `chat/ChatService.java` — `onCompleteResponse`

Capture `startMs` just before `model.chat()` is called (in `stream()`). In `onPartialResponse`, record `ttftMs` on the first invocation using an `AtomicLong` flag (set once, ignored on subsequent calls). Compute total latency inside `onCompleteResponse`. Replace the current save call:

```java
// before
MessageEntity saved = messageRepository.save(new MessageEntity(
    chatId, "assistant", response.aiMessage().text(),
    resolved.provider().name(), resolved.model()
));

// after — startMs captured before model.chat(); ttftMs recorded in onPartialResponse
TokenUsage usage = response.tokenUsage();
MessageEntity saved = messageRepository.save(new MessageEntity(
    chatId, "assistant", response.aiMessage().text(),
    resolved.provider().name(), resolved.model(),
    usage != null ? usage.inputTokenCount()  : null,
    usage != null ? usage.outputTokenCount() : null,
    usage != null ? usage.totalTokenCount()  : null,
    response.finishReason() != null ? response.finishReason().name() : null,
    response.id(),
    (int) (System.currentTimeMillis() - startMs),
    ttftMs.get() > 0 ? (int) ttftMs.get() : null,
    response.modelName()
));
```

The `done` SSE event already sends `finishReason` as a hardcoded `"stop"` string — update it to use the actual value:

```java
send(emitter, "done", Map.of(
    "messageId", saved.getId().toString(),
    "finishReason", saved.getFinishReason() != null ? saved.getFinishReason() : "UNKNOWN"
));
```

### 4. `chat/ChatService.java` — `MessageSummary`

Extend the record to expose the new fields in `GET /chats/{chatId}/messages`:

```java
public record MessageSummary(
    UUID id, String role, String provider, String model, String content, Instant createdAt,
    Integer inputTokens, Integer outputTokens, Integer totalTokens,
    String finishReason, String responseId,
    Integer latencyMs, Integer ttftMs, String resolvedModel
) {}
```

Update the mapping in `getMessages()` accordingly.

## Notes

- All columns except `latency_ms` and `ttft_ms` are nullable — the app must handle providers that omit token counts (Mistral omits `totalTokenCount`; some providers omit all three).
- Use an `AtomicLong` (initialized to `-1`) for `ttftMs` so the first-token timestamp is set exactly once in `onPartialResponse` without synchronization overhead.
- `resolved_model` is nullable because `response.modelName()` can be null; when null, the requested `model` is the best available identifier.
- `response.tokenUsage()` itself can be null; null-check before accessing counts.
- No existing rows are affected — the migration is additive only.
