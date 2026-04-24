# Multi-Provider LLM Chat Backend — Implementation Spec

## 1. Overview

A backend service that lets authenticated users send messages to LLMs from multiple providers (Anthropic, OpenAI, Google, etc.) using their own API keys. Built on **Spring Boot 3.x (Java 21)**, **LangChain4j** for provider abstraction, and **PostgreSQL** for persistence. Streaming responses are delivered via **Server-Sent Events (SSE)**.

---

## 2. Tech Stack & Dependencies

- **Java**: 21 (LTS)
- **Spring Boot**: 3.3.x or later
- **PostgreSQL**: 15+
- **LangChain4j**: latest stable (≥ 0.35)
- **Build**: Gradle or Maven (engineer's choice; examples below use Gradle)

Required Spring Boot starters:
- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-oauth2-resource-server`
- `spring-boot-starter-validation`

Required LangChain4j modules:
- `langchain4j-core`
- `langchain4j-anthropic`
- `langchain4j-open-ai`
- `langchain4j-google-ai-gemini` (or whichever providers are in scope)
- `langchain4j-spring-boot-starter` (optional convenience)

Other:
- `postgresql` JDBC driver
- `flyway-core` for migrations
- `bucket4j-core` for rate limiting
- `lombok` (optional)

---

## 3. Authentication

### 3.1 Strategy

**Google OAuth2 only**, using Spring Security's OAuth2 Resource Server with Google ID tokens as bearer JWTs.

### 3.2 Flow

1. Client performs Google OAuth on the frontend and obtains a Google ID token (JWT).
2. Client sends the ID token as `Authorization: Bearer <token>` on every API request.
3. Backend validates the token against Google's JWKS endpoint (`https://www.googleapis.com/oauth2/v3/certs`) using Spring Security's `JwtDecoder`.
4. On first successful auth for a new `sub` (Google's stable subject identifier), a row is created in `users` with `google_sub = sub`, `email`, `display_name` (from `name`), `picture_url` (from `picture`).
5. On every successful auth, `last_login_at` is updated.
6. The user's internal `users.id` (not `google_sub`) is exposed to controllers via a custom `@AuthenticationPrincipal` resolver or a `CurrentUser` argument resolver.

### 3.3 Configuration

In `application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.google.com
          audiences:
            - ${GOOGLE_OAUTH_CLIENT_ID}
```

### 3.4 User Provisioning

Implement a `JwtAuthenticationConverter` or an `OncePerRequestFilter` that runs after JWT validation and:
- Looks up `users` by `google_sub`.
- If missing, inserts a new row.
- If present, updates `last_login_at` (throttled; no need to write on every request — only if `now - last_login_at > 1 hour`).
- Populates `SecurityContext` with a principal object exposing `userId` (internal UUID) and `email`.

### 3.5 Protected Routes

All routes under `/api/**` require authentication **except** a health check endpoint (`GET /health`) which returns `200 OK` with `{"status":"ok"}`.

---

## 4. Database Schema (PostgreSQL)

All migrations live in `src/main/resources/db/migration/` and are managed by Flyway.

### 4.1 `users`

```sql
CREATE TABLE users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub     VARCHAR(255) NOT NULL UNIQUE,
    email          VARCHAR(320) NOT NULL,
    display_name   VARCHAR(255),
    picture_url    TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### 4.2 `api_keys`

```sql
CREATE TABLE api_keys (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(50) NOT NULL,
    encrypted_key  TEXT        NOT NULL,
    key_iv         TEXT        NOT NULL,  -- base64-encoded AES-GCM IV
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_api_keys_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
```

- `encrypted_key` holds AES-GCM ciphertext (base64). See §7.
- `provider` values are validated against the known-provider enum (§6.1).
- **The plaintext key is never returned from any endpoint after creation.**

### 4.3 `chats`

```sql
CREATE TABLE chats (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_user_id_updated_at ON chats(user_id, updated_at DESC);
```

- `title` is nullable; generated from the first user message (§8.2).
- `updated_at` is bumped whenever a new message is added to the chat — used for sidebar ordering.

### 4.4 `messages`

```sql
CREATE TABLE messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     JSONB       NOT NULL,
    provider    VARCHAR(50),
    model       VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at ASC);
```

- `content` is JSONB. Initial shape: `{"message": "hello world"}`. Future shapes can add `attachments`, `images`, etc. without schema changes.
- `provider` and `model` are nullable only for safety; in practice every message row will have them populated (user messages record which provider/model they were sent to; assistant messages record which provider/model produced them).
- `role` is constrained at the DB level to `'user'` or `'assistant'`.

---

## 5. API Endpoints

All endpoints are prefixed with `/api`. All return JSON unless otherwise noted. All require a valid Google ID token bearer except `GET /health`.

### 5.1 `POST /api/apiKeys`

Saves or updates an API key for a provider.

**Request body:**
```json
{
  "provider": "anthropic",
  "key": "sk-ant-..."
}
```

**Validation:**
- `provider`: required, non-blank, must be in the known-providers list (§6.1).
- `key`: required, non-blank, max 500 chars.

**Behavior:**
- Encrypts `key` using AES-GCM (§7).
- Upserts into `api_keys` keyed by `(user_id, provider)`. If a row exists, replace `encrypted_key`, `key_iv`, and bump `updated_at`.

**Response:** `200 OK`
```json
{
  "provider": "anthropic",
  "createdAt": "2026-04-24T12:34:56Z",
  "updatedAt": "2026-04-24T12:34:56Z"
}
```

**The plaintext key is never returned.** There is no `GET` endpoint that returns it.

**Error cases:**
- `400` — invalid provider or missing fields.
- `401` — missing/invalid auth.

### 5.2 `POST /api/chats` → SSE

Creates a new chat and sends the first message. Responds with SSE stream.

**Request body:**
```json
{
  "provider": "anthropic",
  "model": "claude-opus-4-7",
  "content": {
    "message": "hello world"
  }
}
```

**Validation:**
- `provider`: required, must be in known-providers list.
- `model`: required, must be a valid model id for that provider (§8.3).
- `content.message`: required, non-blank, max 100,000 chars.
- User must have an `api_keys` row for `provider`; otherwise `400`.

**Behavior:**
1. Create a new `chats` row for the authenticated user with `title = null`.
2. Insert the user message into `messages` (content as JSONB).
3. Open SSE stream.
4. Emit initial event containing the new `chatId` (so the client can route to `/chats/{chatId}`):
   ```
   event: chat_created
   data: {"chatId":"<uuid>"}
   ```
5. Decrypt the user's API key for this provider (§7).
6. Construct LangChain4j `StreamingChatLanguageModel` for the requested provider/model (§8.1).
7. Construct `MessageWindowChatMemory` hydrated from the messages of this chat (§8.4). For a brand-new chat this will contain just the one user message.
8. Stream assistant tokens; for each token emit:
   ```
   event: token
   data: {"text":"<partial text>"}
   ```
9. On completion, emit:
   ```
   event: done
   data: {"messageId":"<uuid>","finishReason":"stop"}
   ```
10. Persist the full assistant response as a new `messages` row **once** at stream end (buffer approach — do not write on every token).
11. Update `chats.updated_at`.
12. Generate and persist `chats.title` from the first user message (§8.2). Emit:
    ```
    event: title
    data: {"title":"<generated title>"}
    ```

**Error handling during streaming:**
- If the provider call fails mid-stream, emit:
  ```
  event: error
  data: {"message":"<error description>","code":"PROVIDER_ERROR"}
  ```
  then close. Persist whatever partial assistant text was accumulated (with a flag is not strictly necessary — it's still a valid message).

**Response content type:** `text/event-stream`

### 5.3 `POST /api/chats/{chatId}/messages` → SSE

Sends a new message to an existing chat.

**Request body:** Same shape as `POST /api/chats`.

**Validation:**
- `chatId` must exist and `chats.user_id` must equal the authenticated user. Otherwise `404` (do not leak existence of other users' chats).
- All body validation same as `POST /api/chats`.

**Behavior:**
Steps 2–11 of `POST /api/chats`, skipping chat creation and title generation. The `chat_created` event is not emitted.

### 5.4 `GET /api/chats`

Lists the authenticated user's chats (for sidebar).

**Query params (optional):**
- `limit`: default 50, max 200.
- `before`: ISO-8601 timestamp cursor; returns chats with `updated_at < before`.

**Response:** `200 OK`
```json
{
  "chats": [
    {
      "id": "<uuid>",
      "title": "Some chat title",
      "createdAt": "2026-04-24T12:00:00Z",
      "updatedAt": "2026-04-24T12:30:00Z"
    }
  ],
  "nextCursor": "2026-04-24T11:59:59Z"
}
```

Ordered by `updated_at DESC`. `nextCursor` is the `updated_at` of the last returned chat, or `null` if fewer than `limit` rows were returned.

### 5.5 `GET /api/chats/{chatId}/messages`

Fetches messages for a chat.

**Authorization:** chat must belong to the authenticated user; otherwise `404`.

**Query params (optional):**
- `limit`: default 100, max 500.
- `before`: ISO-8601 timestamp cursor; returns messages with `created_at < before`.

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "id": "<uuid>",
      "role": "user",
      "provider": "anthropic",
      "model": "claude-opus-4-7",
      "content": { "message": "hello world" },
      "createdAt": "2026-04-24T12:00:00Z"
    },
    {
      "id": "<uuid>",
      "role": "assistant",
      "provider": "anthropic",
      "model": "claude-opus-4-7",
      "content": { "message": "Hi! How can I help?" },
      "createdAt": "2026-04-24T12:00:02Z"
    }
  ],
  "nextCursor": null
}
```

Ordered by `created_at ASC`.

### 5.6 `GET /api/models`

Lists all supported models, grouped by provider.

**Query params (optional):**
- `provider`: filter to a single provider.

**Response:** `200 OK`
```json
{
  "providers": [
    {
      "provider": "anthropic",
      "models": [
        { "id": "claude-opus-4-7", "displayName": "Claude Opus 4.7" },
        { "id": "claude-sonnet-4-6", "displayName": "Claude Sonnet 4.6" }
      ]
    },
    {
      "provider": "openai",
      "models": [
        { "id": "gpt-4o", "displayName": "GPT-4o" }
      ]
    }
  ]
}
```

Model lists come from LangChain4j where available, or from a hardcoded `ModelRegistry` for providers that don't expose a list endpoint. See §8.3.

### 5.7 `GET /api/models/{provider}/{modelId}`

Fetches a single model's metadata.

**Response:** `200 OK`
```json
{
  "provider": "anthropic",
  "id": "claude-opus-4-7",
  "displayName": "Claude Opus 4.7",
  "contextWindow": 200000,
  "supportsStreaming": true
}
```

`404` if provider or model is unknown.

---

## 6. Domain Rules

### 6.1 Known Providers

Hardcoded enum:
```java
public enum Provider {
    ANTHROPIC("anthropic"),
    OPENAI("openai"),
    GOOGLE("google");
    // add more as supported
}
```

Any request with an unknown `provider` string returns `400` with message `"Unknown provider: <value>"`.

### 6.2 Model Validation

On every `POST /api/chats` and `POST /api/chats/{chatId}/messages`, verify the requested `model` is in the `ModelRegistry` for the given `provider`. If not, return `400` with message `"Model '<model>' is not available for provider '<provider>'"`.

### 6.3 Ownership Checks

For every chat-scoped endpoint, verify `chats.user_id == authenticatedUserId` before any other work. On mismatch return `404` (not `403`) so existence is not leaked.

---

## 7. API Key Encryption

### 7.1 Algorithm

AES-256-GCM.

### 7.2 Master Key

The master encryption key is loaded from an environment variable `API_KEY_ENCRYPTION_KEY` (base64-encoded 32 bytes). In production this should be sourced from a secrets manager (AWS KMS, GCP Secret Manager, HashiCorp Vault) — the env var is the injection point; rotation strategy is out of scope for v1.

### 7.3 Encryption

```
iv = random 12 bytes
ciphertext = AES-GCM-encrypt(masterKey, iv, plaintext, aad = userId || provider)
store: encrypted_key = base64(ciphertext + authTag), key_iv = base64(iv)
```

Using `userId || provider` as AAD prevents ciphertext swapping between users or providers.

### 7.4 Decryption

Reverse of the above. If decryption fails, throw `InternalServerError` — do not leak details to the client.

### 7.5 Implementation

Provide a `CryptoService` Spring bean with two methods:
- `EncryptedValue encrypt(String plaintext, String aad)`
- `String decrypt(String ciphertextB64, String ivB64, String aad)`

Use `javax.crypto.Cipher` with `"AES/GCM/NoPadding"` and a 128-bit auth tag.

---

## 8. LangChain4j Integration

### 8.1 Streaming Model Construction

For each provider, provide a factory that returns a `StreamingChatLanguageModel` given an API key and model id:

```java
public interface StreamingModelFactory {
    Provider provider();
    StreamingChatLanguageModel create(String apiKey, String modelId);
}
```

Implementations:
- `AnthropicStreamingModelFactory` → `AnthropicStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build()`
- `OpenAiStreamingModelFactory` → `OpenAiStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build()`
- etc.

A `StreamingModelRouter` bean holds a `Map<Provider, StreamingModelFactory>` and selects the right factory at request time.

### 8.2 Title Generation

After the first assistant response completes in `POST /api/chats`, send a follow-up non-streaming call to the **same provider and model** the user chose:

- System prompt: `"Generate a short (max 6 words) title summarizing this conversation. Reply with only the title, no quotes."`
- User prompt: the first user message's text.

Use a non-streaming `ChatLanguageModel` (not `StreamingChatLanguageModel`) built from the same factory pattern. Persist the result to `chats.title`. If generation fails, leave `title` null — do not block the main flow.

### 8.3 Model Registry

A singleton `ModelRegistry` bean:

```java
public record ModelInfo(String id, String displayName, int contextWindow, boolean supportsStreaming) {}

public interface ModelRegistry {
    List<ModelInfo> modelsFor(Provider provider);
    Optional<ModelInfo> find(Provider provider, String modelId);
    Map<Provider, List<ModelInfo>> all();
}
```

Initial implementation: hardcoded Java maps. The model list should be editable in a single file — engineer should expect to bump this file when new models ship. Example entries:

```java
Map.of(
    Provider.ANTHROPIC, List.of(
        new ModelInfo("claude-opus-4-7", "Claude Opus 4.7", 200_000, true),
        new ModelInfo("claude-sonnet-4-6", "Claude Sonnet 4.6", 200_000, true)
    ),
    Provider.OPENAI, List.of(
        new ModelInfo("gpt-4o", "GPT-4o", 128_000, true)
    )
);
```

### 8.4 Chat Memory Hydration

For each streaming request:

1. Load all prior messages for the chat (`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`).
2. Construct a `MessageWindowChatMemory` with `maxMessages = 100` (configurable).
3. For each row, add to memory:
   - `role = 'user'` → `UserMessage.from(content.message)`
   - `role = 'assistant'` → `AiMessage.from(content.message)`
4. Add the new user message to memory before invoking the model.
5. Pass memory to the `StreamingChatLanguageModel` via LangChain4j's `AiServices` or by converting memory to a `List<ChatMessage>` and calling `model.generate(messages, handler)`.

**Memory is not persisted beyond the request.** Each request rehydrates from the DB. This ensures correctness across restarts, multiple backend instances, and horizontal scaling.

### 8.5 Token Streaming Handler

Implement a `StreamingResponseHandler<AiMessage>` that:
- On `onNext(String token)` — emit SSE `token` event with `{"text": token}` and append token to an in-memory `StringBuilder`.
- On `onComplete(Response<AiMessage> response)` — persist the buffered text as a new `messages` row, bump `chats.updated_at`, emit `done` event.
- On `onError(Throwable e)` — log, persist whatever was buffered (if non-empty), emit `error` event, close the stream.

---

## 9. SSE Implementation Notes

Use Spring's `SseEmitter`:

```java
@PostMapping(value = "/chats", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public SseEmitter createChat(@Valid @RequestBody NewChatRequest req, @CurrentUser UserPrincipal user) {
    SseEmitter emitter = new SseEmitter(5 * 60 * 1000L); // 5-minute timeout
    chatService.streamNewChat(user.userId(), req, emitter);
    return emitter;
}
```

The `chatService.streamNewChat` method should do its work on a separate thread (use a dedicated `ExecutorService` bean sized for expected concurrent streams — start with a fixed pool of 50, make it configurable). The controller returns immediately.

**Always call `emitter.complete()` in a `finally` block.** On error, call `emitter.completeWithError(ex)`.

SSE events are emitted via:
```java
emitter.send(SseEmitter.event().name("token").data(Map.of("text", token)));
```

---

## 10. Rate Limiting

Use Bucket4j with an in-memory bucket per user (acceptable for single-instance v1; move to Redis-backed buckets when scaling horizontally).

**Limits:**
- `POST /api/chats` and `POST /api/chats/{chatId}/messages`: 30 requests per minute per user.
- All other endpoints: 120 requests per minute per user.

On exceed: return `429 Too Many Requests` with header `Retry-After: <seconds>`.

Implement as a `HandlerInterceptor` or `OncePerRequestFilter` keyed by `userId`.

---

## 11. Error Response Format

All error responses follow:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { }
  }
}
```

Codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `NOT_FOUND` (404)
- `RATE_LIMITED` (429)
- `PROVIDER_ERROR` (502) — upstream LLM provider failed
- `INTERNAL_ERROR` (500)

Implement via a `@RestControllerAdvice` with `@ExceptionHandler` methods.

---

## 12. Configuration

`application.yml` keys the engineer must wire:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate   # Flyway owns schema
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.google.com
          audiences: [${GOOGLE_OAUTH_CLIENT_ID}]

app:
  encryption:
    master-key: ${API_KEY_ENCRYPTION_KEY}   # base64 32 bytes
  chat:
    memory-max-messages: 100
    sse-timeout-ms: 300000
    streaming-executor-pool-size: 50
  rate-limit:
    chat-rpm: 30
    default-rpm: 120
```

---

## 13. Package Layout (Suggested)

```
com.example.llmchat
├── auth/
│   ├── GoogleJwtAuthenticationConverter.java
│   ├── UserPrincipal.java
│   ├── CurrentUserArgumentResolver.java
│   └── UserProvisioningService.java
├── apikeys/
│   ├── ApiKeyController.java
│   ├── ApiKeyService.java
│   ├── ApiKey.java (JPA entity)
│   └── ApiKeyRepository.java
├── chats/
│   ├── ChatController.java
│   ├── ChatService.java
│   ├── MessageStreamingService.java
│   ├── Chat.java
│   ├── Message.java
│   ├── ChatRepository.java
│   └── MessageRepository.java
├── models/
│   ├── ModelController.java
│   ├── ModelRegistry.java
│   └── Provider.java
├── llm/
│   ├── StreamingModelFactory.java
│   ├── StreamingModelRouter.java
│   ├── AnthropicStreamingModelFactory.java
│   ├── OpenAiStreamingModelFactory.java
│   └── TitleGenerator.java
├── crypto/
│   ├── CryptoService.java
│   └── EncryptedValue.java
├── common/
│   ├── GlobalExceptionHandler.java
│   ├── RateLimitInterceptor.java
│   └── ApiError.java
└── LlmChatApplication.java
```

---

## 14. Testing Requirements

Engineer should provide:
- **Unit tests** for `CryptoService` (encrypt/decrypt round-trip, AAD mismatch detection, tamper detection).
- **Unit tests** for `ModelRegistry` lookups.
- **Integration tests** using Testcontainers (PostgreSQL) for:
  - Api key upsert behavior.
  - Chat creation persists user message before first token.
  - `GET /api/chats/{chatId}/messages` returns 404 for another user's chat.
  - Ownership checks on all chat-scoped endpoints.
- **SSE integration test** using `WebTestClient` that verifies the event sequence (`chat_created`, `token`+, `done`, `title`) for `POST /api/chats`. LangChain4j model calls should be mocked via a fake `StreamingChatLanguageModel` that emits a fixed token sequence.

---

## 15. Out of Scope for v1

- Key rotation for the AES master key.
- Multi-region deployment.
- Redis-backed rate limiting.
- Attachments (images, PDFs, video) — schema supports it via JSONB, but no endpoints accept them yet.
- Tool/function calling.
- Message editing or deletion.
- Chat sharing or collaboration.
- Admin endpoints.
