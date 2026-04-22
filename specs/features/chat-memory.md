# Chat Memory & Dynamic Models

Move the chat loop from stateless "client sends the whole history every turn" to a server-owned, per-user, per-chat memory. The server tracks conversation state keyed by `(userId, chatId)`; the client sends only the new user turn plus the model it wants for that turn. Switching models mid-conversation is a first-class case, not an edge case.

This is **backend-only** work. The frontend will be updated in a follow-up spec; nothing here should require frontend changes to proceed in parallel. The current `POST /chat` surface stays wire-compatible until the frontend cuts over (see "Migration").

## Goal

Three properties, in priority order:

1. **Dynamic models per turn.** A chat belongs to a user, not to a model. The user can start a turn on `gpt-4o`, the next on `claude-opus-4-7`, and the next back on `gpt-4o`, and the conversation history flows through every turn untouched. No "this chat is locked to provider X" state.
2. **Memory scoped to `(userId, chatId)`.** History lives on the server. Every request is authenticated; every chat lookup is filtered by the authenticated user. Any attempt to read, append to, or delete a chat you don't own returns `404` (not `403` — don't confirm the chat exists).
3. **Stream-safe persistence.** The assistant's reply is streamed to the client and *also* captured so it lands in memory verbatim on completion. A disconnected or errored stream does not silently corrupt history.

Built on LangChain4j's `ChatMemory` + `ChatMemoryStore` abstractions so we don't hand-roll message-window trimming, and so swapping in persistent storage later is a store-swap, not a rewrite.

## Shape

```
┌──────────────┐   POST /chats                           ┌──────────────────────┐
│  Frontend    │ ─────────────────────────────────────▶  │  ChatController      │
│  (auth'd)    │ ◀────── 201 { chatId }                  │                      │
└──────────────┘                                         │                      │
        │                                                │                      │
        │  POST /chats/{chatId}/messages  (SSE)          │  ┌────────────────┐  │
        │  { provider, model, content }                  │  │ ChatService    │  │
        │ ────────────────────────────────────────────▶  │  │                │  │
        │                                                │  │ 1. load memory │  │
        │                                                │  │ 2. append user │  │
        │                                                │  │ 3. build model │  │
        │                                                │  │    (dynamic)   │  │
        │ ◀── data: {"type":"delta","text":"..."} ──     │  │ 4. stream      │  │
        │ ◀── data: {"type":"delta","text":"..."} ──     │  │ 5. on done:    │  │
        │ ◀── data: {"type":"done","chatId":"..."} ──    │  │    append ai   │  │
        │                                                │  └────────────────┘  │
        │                                                │           │          │
        │                                                │           ▼          │
        │                                                │  ┌────────────────┐  │
        │                                                │  │ ChatMemoryStore│  │
        │                                                │  │  (userId+chatId│  │
        │                                                │  │   → messages)  │  │
        │                                                │  └────────────────┘  │
        └────────────────────────────────────────────────┘──────────────────────┘
```

The model is constructed per turn from `(provider, modelName, apiKey)`. Memory is independent of the model — just a list of `ChatMessage` replayed into whatever `StreamingChatModel` the current turn picks.

## Backend contract

### Endpoints

All require an authenticated session (per `google-auth.md`). CSRF-exempted like `/chat` is today.

- `POST /chats` — create a new, empty chat for the current user.
  - Request body: optional `{ "title": "..." }`. If omitted, title is `null` and may be filled in later by a separate titling pass (out of scope).
  - Response `201`:
    ```json
    { "chatId": "01HXYZ...", "createdAt": "2026-04-22T17:04:12Z", "title": null }
    ```
  - IDs are bare ULIDs. Sortable, opaque, safe to log.

- `POST /chats/{chatId}/messages` — send the next user turn and stream the assistant reply.
  - Request body:
    ```json
    { "provider": "anthropic", "model": "claude-opus-4-7", "content": "Tell me a joke." }
    ```
  - Response: `text/event-stream`. Events (one JSON object per `data:` line):
    - `{ "type": "delta", "text": "..." }` — chunk of assistant text.
    - `{ "type": "done", "chatId": "01H...", "messageId": "msg_..." }` — clean finish; connection closes.
    - `{ "type": "error", "message": "..." }` — provider/validation error mid-stream; connection closes.
  - Ownership: if `chatId` doesn't belong to the authenticated user, return `404` *before* opening the stream. Do not leak existence.
  - Validation: `provider`/`model` validated against the per-provider catalogs exactly like the current `/chat` endpoint. A validation error returns `400` with a JSON body and does **not** append anything to memory.

- `GET /chats` — list the current user's chats, newest first.
  - Response `200`:
    ```json
    {
      "chats": [
        { "chatId": "01H...", "title": null, "createdAt": "...", "updatedAt": "..." }
      ]
    }
    ```

- `GET /chats/{chatId}` — fetch a chat's full message history for replay on page load.
  - Response `200`:
    ```json
    {
      "chatId": "01H...",
      "title": null,
      "createdAt": "...",
      "updatedAt": "...",
      "messages": [
        { "id": "msg_...", "role": "user",      "content": "...", "createdAt": "..." },
        { "id": "msg_...", "role": "assistant", "content": "...", "createdAt": "...", "provider": "anthropic", "model": "claude-opus-4-7" }
      ]
    }
    ```
  - Returns `404` if the chat does not exist **or** belongs to another user. Same error — no existence oracle.

- `DELETE /chats/{chatId}` — delete the chat and its memory. `204` on success, `404` otherwise. Idempotent from the client's perspective.

The legacy `POST /chat` stays in place and keeps working unchanged — see "Migration".

### Model switching, concretely

Model selection is a property of each **turn**, not the chat. The `Chat` aggregate does not store a "current model". The controller:

1. Resolves `(provider, model)` from the request body.
2. Validates against the catalog (same logic as today's `ChatService#validate`).
3. Loads the memory for `(userId, chatId)`.
4. Appends the user's `content` as a `UserMessage` *immediately* — before the stream starts — so it's durable even if the provider call fails.
5. Builds a fresh `StreamingChatModel` via `StreamingChatModelBuilder` (existing class; no changes needed).
6. Replays `memory.messages()` into the model and streams.
7. On `onCompleteResponse`, appends the full assistant response as an `AiMessage` with `provider` and `model` recorded on the stored message.
8. On `onError`, does **not** append an assistant message; the user turn is already durable and the client can retry.

Per-turn message records carry `provider` and `model` fields so the UI can show "this reply came from Opus" on historical turns. The memory *replayed to the next turn's model* is just `role + content` — providers don't care which model wrote a previous `AiMessage`.

### Memory internals

`dev.langchain4j.memory.chat.MessageWindowChatMemory` with a configured window (default: 40 messages; tunable via `app.chat.memory.window`). Window trimming is a front-of-list operation that preserves the system prompt if present. We don't need token-windowed memory for v1 — the message window is simpler and predictable.

Memory is obtained per request via a `ChatMemoryProvider` keyed by a composite memory id `userId + ":" + chatId`. The composite id is an internal detail — it never appears in API responses and is not derivable by clients.

`ChatMemoryStore` implementation: a new `InMemoryChatMemoryStore` backed by `ConcurrentHashMap<String memoryId, List<ChatMessage>>`. Writes are guarded by a per-memory-id lock so interleaved streams against the same `(userId, chatId)` don't corrupt the list. V1 assumes a single JVM — the lock is local.

Persistence is **deliberately** in-memory for this spec, mirroring the auth spec's choice. A future `chat-persistence.md` spec will introduce a JPA-backed `ChatMemoryStore` + `ChatRepository`; every call site in this spec goes through the store interface so that swap is a one-file change.

### Ownership enforcement

There is **one** place ownership is checked: a `ChatAccess` guard at the service boundary.

```java
record ChatHandle(String chatId, String userId) {}

ChatHandle require(String chatId, String userId);  // throws ChatNotFoundException otherwise
```

Every operation — message append, read, delete, memory load — goes through `ChatAccess.require(chatId, userId)` first. Controllers never look up a chat by id alone. `ChatNotFoundException` maps to HTTP `404`. There is no `403`. A user who tries to read another user's chat sees exactly what they'd see for a fabricated id.

The `userId` always comes from the authenticated session (`SessionUser.ATTRIBUTE`). It is never read from the request body or a path parameter. Any endpoint that accepts `userId` in input is a bug.

### Aggregate shape

```java
public record Chat(
    String id,           // ULID
    String userId,       // owner; never changes
    String title,        // nullable; set later by titling pass
    Instant createdAt,
    Instant updatedAt    // touched on every appended message
) {}

public record ChatMessageRecord(
    String id,           // ULID, "msg_" prefix
    String chatId,
    Role role,           // USER | ASSISTANT
    String content,
    String provider,     // null for USER messages
    String model,        // null for USER messages
    Instant createdAt
) {}
```

Two stores (in-memory for v1, interfaces ready for JPA later):

- `ChatRepository` — chat aggregates: `create`, `findByUser`, `findByIdAndUser`, `touch`, `delete`.
- `ChatMessageRepository` — append-only message log: `append`, `findByChat`.

`ChatMemoryStore` (the LangChain4j interface) is a thin adapter over `ChatMessageRepository` that converts to/from LangChain4j's `ChatMessage` type. Memory writes from LC4j — which is what actually persists replies — go through the repository so there's a single source of truth.

### Streaming correctness

The streaming flow has three mutation points, in order:

1. **Before stream opens:** append user message to memory. If this throws, return `500` with no event stream.
2. **During stream:** forward deltas to SSE only; do not touch memory. Accumulate the assistant text in a `StringBuilder` inside the handler.
3. **On completion:** append the accumulated assistant message to memory, send `done`, close the emitter. On error: send `error`, close the emitter, do **not** append.

A client disconnect mid-stream (reader gone) is surfaced to the handler via `IOException` on `emitter.send` — treat it as error: swallow, close, do not append. The user's turn stays durable; the lost assistant response is discarded rather than half-saved.

### Migration from the current `/chat`

The existing `POST /chat` endpoint is stateless and takes the full message list in the body. It stays registered and functional for the duration of the frontend cutover. Once the frontend switches to the new endpoints, the legacy controller is deleted in a follow-up PR. No feature flag — just a deletion once nothing calls it.

The new endpoints do not accept a message history in the body; trying to pass one returns `400`. History is server-owned by design.

## Security

- **Ownership is never trusted from the client.** `userId` always comes from the session. Every repo call is scoped by the authenticated user.
- **404, not 403, for foreign chats.** No existence oracle. Don't leak whether a given chatId was real.
- **Session required.** `/chats/**` is added to the `authenticated()` matcher in `SecurityConfig`. Unauthenticated requests get `401`, matching `/chat/**` today.
- **CSRF.** `/chats/**` is added to the existing `/chat/**` CSRF ignore list (still SSE/POST with cookie auth, same threat model).
- **PII in logs.** Message content is never logged at INFO or above. Provider/model/chatId/userId are fine to log; the body is not.
- **Cross-user leakage test.** An integration test creates two users, one chat each, and asserts every cross-access attempt — GET, POST, DELETE — returns `404`.

## Errors

Validation errors (`400`) close the request before a stream opens; the body is JSON `{ "error": "..." }`, same shape as the existing `ChatValidationException` handler.

In-stream errors (`error` event) keep the SSE framing — the client already handles this for the legacy `/chat`. Codes we expect to surface:

- `provider_error` — the upstream provider returned an error. Message is the provider's text, lightly sanitized.
- `model_unavailable` — the requested model isn't in the provider catalog at the time of the turn (catalogs can change).
- `chat_not_found` — only as a pre-stream `404`, never as an SSE event.
- `server_error` — fallback. Logged with a correlation id.

## Testing

- **Unit:** `ChatAccess.require` throws `ChatNotFoundException` for (a) unknown id, (b) id owned by a different user, and returns the handle for the owner.
- **Unit:** `MessageWindowChatMemory` trims to the configured window; system messages (if/when we add them) are preserved.
- **Unit:** `InMemoryChatMemoryStore` round-trips LC4j `ChatMessage` types (`UserMessage`, `AiMessage`) through `ChatMessageRepository`.
- **Integration (MockMvc):** `POST /chats/{id}/messages` requires a session; returns `404` for a foreign chat; streams deltas + a `done` event; on completion, `GET /chats/{id}` shows the user message, the assistant message, and the `provider`/`model` on the assistant message.
- **Integration:** two-user isolation — cross-user GET, POST, DELETE all `404`.
- **Integration:** provider-switching — submit three turns against the same chatId with three different `(provider, model)` pairs; assert the final history is in order and each assistant message records the model that produced it.
- **Integration:** provider failure mid-stream — mock `StreamingChatModel` that calls `onError`; assert the user message *is* in memory, the assistant message is *not*, and the client saw an `error` event.
- **Integration:** validation failure — invalid `provider` returns `400` and does **not** append the user message. Memory is unchanged.
- **Integration:** client disconnect — simulate `IOException` on `emitter.send`; assert no assistant message is appended and the emitter is closed.

Manual smoke test: start a chat on OpenAI, send two turns, switch to Anthropic, send a turn that references something from the OpenAI turns, verify continuity.

## Out of scope (for this spec)

- **Persistent storage.** `chat-persistence.md` will introduce JPA + migrations. This spec is in-memory with interface seams ready for that swap.
- **Chat titling.** Auto-generating a title from the first turn is a follow-up.
- **Streaming cancellation / stop-generation.** No `DELETE /chats/{id}/messages/current` or equivalent in v1.
- **Editing or deleting individual messages.** Whole-chat delete only.
- **Regenerating a turn with a different model.** Possible with the current shape (re-POST the same prompt), but no dedicated endpoint.
- **Tool use / function calling.** The memory model supports `AiMessage` only; tool invocations will need their own spec.
- **System prompts per chat.** No `systemPrompt` field yet.
- **Token-based windowing.** Message-count window only.
- **Rate limiting.** Per-user quotas are a separate concern.
- **Frontend changes.** The UI still calls the legacy `/chat` until the follow-up frontend spec lands.

## Resolved decisions

- **Memory is server-owned.** The client no longer sends history. Rationale: (1) prevents history tampering, (2) enables per-chat context growth without hitting request-size limits, (3) is a precondition for persistence — sending history forever is a dead-end architecture.
- **Model is a per-turn choice, not a chat attribute.** No "primary model" on `Chat`. Rationale: the user's request — switching mid-conversation must be seamless, not a migration. Recording provider/model on each assistant message gives the UI enough to show "this reply came from X" without coupling the chat to a model.
- **`(userId, chatId)` keying, not `chatId` alone.** Ownership is baked into every lookup. Rationale: defense-in-depth — even if a controller forgets to check, the repository call with the wrong `userId` returns empty.
- **404 for foreign chats, not 403.** Don't confirm existence. Rationale: same reason public systems don't distinguish "wrong password" from "no such user".
- **LangChain4j `ChatMemory` + `ChatMemoryStore`.** Rationale: windowing is solved; swapping stores (in-memory → JPA → Redis) is an interface change. No hand-rolled history trimming.
- **In-memory v1, JPA follow-up.** Rationale: mirrors the auth spec's staging. Keeps scope small; avoids committing to a schema before the shape has lived in the app.
- **Bare ULIDs for chat ids; typed prefix (`msg_`) for message ids.** Rationale: sortable, opaque, easy to log. Chat ids are the primary entity in URLs and stay clean; message ids keep the `msg_` prefix to avoid confusion with chat ids in logs and error messages.
- **User turn persisted *before* the stream opens.** Rationale: provider failures are the common case; losing the user's typed message because the upstream hiccuped is the worst user experience.
- **Assistant turn persisted only on clean completion.** Rationale: half-saved replies are worse than lost replies — the next turn would replay a truncated assistant message to the model.
- **Per-memory-id lock, not global.** Rationale: two users hitting different chats must not block each other. Same user double-submitting the same chat is the only contention we care about, and that's rare enough to serialize cheaply.
