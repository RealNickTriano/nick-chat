# Multi-Provider LLM Chat Backend — Implementation Spec

## 1. Overview

A backend service that lets authenticated users send messages to LLMs from multiple providers (Anthropic, OpenAI, Google, Mistral, etc.) using their own API keys. Built on **Spring Boot 4.x (Java 21)**, **LangChain4j** for provider abstraction, and **PostgreSQL** for persistence. Streaming responses are delivered via **Server-Sent Events (SSE)**. Authentication is handled via **Google OAuth2** with server-side HTTP sessions.

---

## 2. Tech Stack & Dependencies

- **Java**: 21 (LTS)
- **Spring Boot**: 4.0.5
- **PostgreSQL**: 15+
- **LangChain4j**: 1.13.0
- **Build**: Maven

Required Spring Boot starters:
- `spring-boot-starter-webmvc`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-oauth2-client`
- `spring-boot-starter-validation`

Required LangChain4j modules:
- `langchain4j` (core)
- `langchain4j-anthropic`
- `langchain4j-open-ai`
- `langchain4j-google-ai-gemini`
- `langchain4j-mistral-ai`
- `langchain4j-spring-boot4-starter`

Other:
- `postgresql` JDBC driver
- `flyway-core` for migrations
- `bucket4j-core` for rate limiting *(deferred — see §10)*
- `lombok` (optional)

---

## 3. Authentication ✅ COMPLETED

### 3.1 Strategy

**Google OAuth2** using Spring Security's OAuth2 Client with server-side HTTP sessions. The backend handles the full OAuth redirect dance; the frontend never touches tokens directly.

### 3.2 Flow

1. Frontend redirects the browser to `/auth/login`.
2. Spring redirects to Google's authorization endpoint.
3. Google redirects back to `/auth/callback/*`.
4. `OAuth2LoginSuccessHandler`:
   - Extracts `sub`, `email_verified`, `email`, `name`, `picture` from the `OAuth2User` principal.
   - Rejects users where `email_verified != true` (redirects to frontend with `?auth_error=email_unverified`).
   - Upserts user in `UserRepository` (creates on first login, updates `lastLoginAt` on return visits).
   - Stores the internal user UUID in the HTTP session: `session.setAttribute("userId", user.id())`.
   - Redirects browser to `${app.auth.post-login-redirect}`.
5. All subsequent API requests carry the `JSESSIONID` session cookie. Spring validates the session automatically.
6. Controllers resolve the current user by reading `session.getAttribute("userId")` and looking up the user via `UserRepository`.

### 3.3 Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/login` | Initiates Google OAuth redirect |
| `GET` | `/auth/callback/*` | OAuth callback (handled by Spring) |
| `GET` | `/auth/me` | Returns current user info |
| `POST` | `/auth/logout` | Invalidates session, clears `JSESSIONID` cookie |

**`GET /auth/me` response:**
```json
{
  "id": "<uuid>",
  "googleSub": "...",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "pictureUrl": "https://..."
}
```

### 3.4 CSRF Protection

Enabled via `CookieCsrfTokenRepository.withHttpOnlyFalse()`. The frontend reads the `XSRF-TOKEN` cookie and sends its value as the `X-XSRF-TOKEN` header on all mutating requests (POST, PUT, DELETE).

### 3.5 CORS

Configured to allow credentials from `${app.auth.frontend-origin}`. Allowed methods: `GET, POST, PUT, DELETE, OPTIONS`.

### 3.6 Configuration

```properties
app.auth.frontend-origin=${FRONTEND_ORIGIN}
app.auth.post-login-redirect=${FRONTEND_ORIGIN}
```

### 3.7 Protected Routes

All routes **except** `/auth/**` require an active session. Unauthenticated requests return `401`.

A health check endpoint (`GET /health`) returns `200 OK` with `{"status":"ok"}` and is also permit-all.

### 3.8 User Provisioning

`UserRepository` is currently backed by `InMemoryUserRepository` (sufficient for development). Will be replaced by a JPA-backed `JpaUserRepository` once the database is wired in. The interface is stable — callers are unaffected by the swap.

---

## 4. Database Schema (PostgreSQL)

All migrations live in `src/main/resources/db/migration/` and are managed by Flyway.

`created_at` and `updated_at` columns are managed by **Spring Data JPA auditing**. Annotate the main application class with `@EnableJpaAuditing` and each entity with `@EntityListeners(AuditingEntityListener.class)`. Use `@CreatedDate` for `created_at` and `@LastModifiedDate` for `updated_at`. The migration DDL sets `DEFAULT NOW()` as a safe fallback, but writes always go through JPA.

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
    key_iv         TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_api_keys_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
```

- `encrypted_key` holds AES-GCM ciphertext (base64). See §7.
- `provider` values are validated against the known-provider enum (§6.1).
- **The plaintext key is never returned from any endpoint after creation.**
- `updated_at` is managed by Spring Data JPA auditing (`@LastModifiedDate`). No DB trigger needed.

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
- `updated_at` is managed by Spring Data JPA auditing (`@LastModifiedDate`). No DB trigger needed.

### 4.4 `messages`

```sql
CREATE TABLE messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    provider    VARCHAR(50),
    model       VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at ASC);
```

- `content` is plain text storing the message string.
- `provider` and `model` are recorded on **both** user and assistant messages. For user messages they record which provider/model the message was sent to; for assistant messages they record which provider/model produced the response. This is intentional.
- `role` is constrained at the DB level to `'user'` or `'assistant'`.

---

## 5. API Endpoints

All return JSON unless otherwise noted. All require an active session except `GET /health`.

### 5.1 `POST /apiKeys` ✅ COMPLETED

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
- Upserts into `api_keys` keyed by `(user_id, provider)`. The `updated_at` trigger handles the timestamp automatically.

**Response:** `200 OK`
```json
{
  "provider": "anthropic",
  "createdAt": "2026-04-24T12:34:56Z",
  "updatedAt": "2026-04-24T12:34:56Z"
}
```

**The plaintext key is never returned.**

**Error cases:**
- `400` — invalid provider or missing fields.
- `401` — missing/invalid session.

### 5.2 `GET /apiKeys` ✅ COMPLETED

Returns which providers the authenticated user has configured API keys for. Metadata only — no keys.

**Response:** `200 OK`
```json
{
  "apiKeys": [
    { "provider": "anthropic", "updatedAt": "2026-04-24T12:34:56Z" },
    { "provider": "openai",    "updatedAt": "2026-04-23T09:00:00Z" }
  ]
}
```

### 5.3 `DELETE /apiKeys/{provider}` ✅ COMPLETED

Removes the stored API key for a provider.

**Validation:**
- `provider`: must be in the known-providers list; otherwise `400`.
- If no key exists for this user + provider, return `404`.

**Response:** `204 No Content`

**Error cases:**
- `400` — unknown provider.
- `401` — missing/invalid session.
- `404` — no key found for this user + provider.

### 5.4 `POST /chats` → SSE ✅ COMPLETED

Creates a new chat and sends the first message. Responds with SSE stream.

**Request body:**
```json
{
  "provider": "anthropic",
  "model": "claude-opus-4-7",
  "content": "hello world"
}
```

**Validation:**
- `provider`: required, must be in known-providers list.
- `model`: required, must be a valid model id for that provider (validated against LangChain4j's `ModelCatalog`).
- `content`: required, non-blank.
- User must have an `api_keys` row for `provider`; otherwise `400`.

**Behavior:**
1. Create a new `chats` row for the authenticated user with `title = null`.
2. Insert the user message into `messages` (content stored as plain text).
3. Open SSE stream.
4. Emit initial event containing the new `chatId` (so the client can route to `/chats/{chatId}`):
   ```
   event: chat_created
   data: {"chatId":"<uuid>"}
   ```
5. Start title generation asynchronously on a virtual thread (§8.2).
6. Decrypt the user's API key for this provider (§7).
7. Construct LangChain4j `StreamingChatModel` and hydrate chat history from `messages` (§8.4).
8. Stream assistant tokens; for each token emit:
   ```
   event: token
   data: {"text":"<partial text>"}
   ```
9. On completion, persist the full assistant response as a new `messages` row, then emit:
   ```
   event: done
   data: {"messageId":"<uuid>","finishReason":"stop"}
   ```
10. Wait for the title future (up to 10 s), then emit:
    ```
    event: title
    data: {"title":"<generated title>"}
    ```
11. Close the stream.

> **Client note:** The `title` event is emitted *after* `done`. Clients must keep the stream open until the stream closes — do not close on `done`.

**Error handling during streaming:**
- If the provider call fails, emit:
  ```
  event: error
  data: {"message":"<error description>","code":"PROVIDER_ERROR"}
  ```
  then close.

**Response content type:** `text/event-stream`

### 5.5 `POST /chats/{chatId}` → SSE ✅ COMPLETED

Sends a new message to an existing chat. The client calls this when it already has a `chatId` (i.e. on any follow-up message).

**Request body:** Same shape as `POST /chats`.

**Validation:**
- Look up `ChatEntity` by `chatId` **and** `userId` in a single query. Return `404` if not found (covers both missing and wrong-owner cases — existence is not leaked).
- All body validation same as `POST /chats`.

**Behavior:**
Same as `POST /chats` except:
- No new `chats` row is created; the existing `ChatEntity` is used directly.
- Title generation is skipped if the chat already has a title (the `stream()` method no-ops when `chat.getTitle() != null`).
- The `chat_created` event is still emitted for protocol consistency.

### 5.6 `GET /chats`

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

### 5.7 `GET /chats/{chatId}/messages`

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
      "content": "hello world",
      "createdAt": "2026-04-24T12:00:00Z"
    },
    {
      "id": "<uuid>",
      "role": "assistant",
      "provider": "anthropic",
      "model": "claude-opus-4-7",
      "content": "Hi! How can I help?",
      "createdAt": "2026-04-24T12:00:02Z"
    }
  ],
  "nextCursor": null
}
```

Ordered by `created_at ASC`.

### 5.8 `GET /models`

Lists available models for each provider by querying LangChain4j's `ModelCatalog` at request time. No local model list is maintained.

**Query params (optional):**
- `provider`: filter to a single provider.

**Response:** `200 OK`
```json
{
  "providers": [
    {
      "provider": "anthropic",
      "models": [
        {
          "id": "claude-opus-4-7",
          "displayName": "Claude Opus 4.7",
          "type": "CHAT",
          "maxInputTokens": 200000,
          "maxOutputTokens": 32000
        }
      ]
    }
  ]
}
```

Fields map directly from LangChain4j's `ModelDescription` (`name` → `id`; optional fields omitted when null). Providers that do not expose a `ModelCatalog` are omitted from the response. See §8.3.

---

## 6. Domain Rules

### 6.1 Known Providers

Hardcoded enum:
```java
public enum Provider {
    ANTHROPIC("anthropic"),
    OPENAI("openai"),
    GOOGLE("google"),
    MISTRAL("mistral");
    // add more as supported
}
```

Any request with an unknown `provider` string returns `400` with message `"Unknown provider: <value>"`.

### 6.2 Model Validation

Model IDs are not validated locally. The requested `model` string is passed directly to the provider via LangChain4j. An unrecognized model ID will be rejected by the provider and surfaced as a `PROVIDER_ERROR` (502).

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

### 8.1 Model & AiService Construction

All provider-specific construction lives in a single `ChatModelFactory` bean. It builds a `StreamingChatModel` and, from that, an `AiService` per request:

```java
@Component
public class ChatModelFactory {

    public StreamingChatModel createModel(Provider provider, String apiKey, String modelId) {
        return switch (provider) {
            case ANTHROPIC -> AnthropicStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build();
            case OPENAI    -> OpenAiStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build();
            case GOOGLE    -> GoogleAiGeminiStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build();
            case MISTRAL   -> MistralAiStreamingChatModel.builder().apiKey(apiKey).modelName(modelId).build();
        };
    }

    public ChatAssistant createAssistant(StreamingChatModel model, ChatMemory memory) {
        return AiServices.builder(ChatAssistant.class)
                .streamingChatModel(model)
                .chatMemory(memory)
                .build();
    }
}

interface ChatAssistant {
    TokenStream chat(@UserMessage String message);
}
```

`TokenStream` (LangChain4j's streaming handle) replaces a manual `StreamingResponseHandler`. See §8.5.

### 8.2 Title Generation

Title generation is handled by a dedicated `TitleGenerationService` that uses a **global application-level API key** (not the user's key) with a low-cost model (`gpt-4o-mini`). This key is configured once via environment variable and is not user-supplied.

After the first assistant response completes in `POST /chats`, `TitleGenerationService` is called asynchronously:

- Provider: OpenAI, Model: `gpt-4o-mini`
- System prompt: `"Generate a short (max 6 words) title summarizing this conversation. Reply with only the title, no quotes."`
- User prompt: the first user message's text.

Use a non-streaming `ChatLanguageModel`. Persist the result to `chats.title`. If generation fails, leave `title` null — do not block the main flow.

**Configuration:**
```properties
app.title-generation.openai-api-key=${TITLE_GENERATION_OPENAI_KEY}
app.title-generation.model=gpt-4o-mini
```

### 8.3 Model Discovery

There is no local model registry. Models are discovered at request time using LangChain4j's `ModelCatalog` interface (`dev.langchain4j.model.catalog.ModelCatalog`). `ChatModelFactory` also exposes catalog lookup:

```java
public Optional<ModelCatalog> catalogFor(Provider provider, String apiKey) {
    return switch (provider) {
        case OPENAI -> Optional.of(/* OpenAI ModelCatalog built with apiKey */);
        // add other providers as LangChain4j support lands
        default -> Optional.empty();
    };
}
```

`GET /models` calls `catalogFor` for each known `Provider`, invokes `listModels()` on the returned catalog, and maps the resulting `ModelDescription` objects to the response. `ModelDescription` fields used in the response:

| `ModelDescription` field | Response field | Notes |
|--------------------------|----------------|-------|
| `name()` | `id` | Always present |
| `displayName()` | `displayName` | Falls back to `name()` if null |
| `type()` | `type` | Omitted if null |
| `maxInputTokens()` | `maxInputTokens` | Omitted if null |
| `maxOutputTokens()` | `maxOutputTokens` | Omitted if null |

For providers that require a user API key to list models, the endpoint passes the calling user's decrypted key. If the user has no stored key for that provider, that provider is skipped. For OpenAI, the application-level `TITLE_GENERATION_OPENAI_KEY` is sufficient and can be used as a fallback so the model list is always available without a user key.

### 8.4 Chat Memory Hydration

For each streaming request:

1. Load the most recent `<memory-max-messages>` messages for the chat using a JPA repository query. Prefer JPA repositories over raw SQL throughout the codebase. Example:
   ```java
   messageRepository.findTopNByChatIdOrderByCreatedAtDesc(chatId, memoryMaxMessages)
   ```
   Reverse the result before building the memory window to restore chronological order.
2. Construct a `MessageWindowChatMemory` with `maxMessages = 100` (configurable).
3. For each DB row, add to memory:
   - `role = 'user'` → `UserMessage.from(content)`
   - `role = 'assistant'` → `AiMessage.from(content)`
4. Do **not** add the new user message to memory manually — pass it as the `@UserMessage` argument to `ChatAssistant.chat()`; LangChain4j adds it to memory automatically.
5. Pass the hydrated `ChatMemory` to `ChatModelFactory.createAssistant()`.

**Memory is not persisted beyond the request.** Each request rehydrates from the DB. This ensures correctness across restarts and horizontal scaling.

### 8.5 TokenStream Handler

Wire `TokenStream` callbacks after calling `assistant.chat(userMessage)`:

```java
StringBuilder buffer = new StringBuilder();

assistant.chat(userMessage)
    .onPartialResponse(token -> {
        buffer.append(token);
        emitter.send(SseEmitter.event().name("token").data(Map.of("text", token)));
    })
    .onCompleteResponse(response -> {
        // persist assistant message, bump updated_at, emit done + title events
    })
    .onError(e -> {
        // persist buffered partial text if non-empty, emit error event
    })
    .start();
```

`TokenStream.start()` is non-blocking; the callbacks fire on LangChain4j's internal thread. The `SseEmitter` is already on its own executor thread (see §9), so emitting from these callbacks is safe.

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

The `chatService.streamNewChat` method should do its work on a separate thread (use a dedicated `ExecutorService` bean sized for expected concurrent streams — start with a fixed pool of 50, make it configurable).

> **Note on pool size:** A fixed pool of 50 means a maximum of 50 concurrent streaming sessions. With a 5-minute SSE timeout this is the hard concurrency ceiling for a single instance. Acceptable for v1; revisit when horizontal scaling is needed.

The controller returns immediately.

**Always call `emitter.complete()` in a `finally` block.** On error, call `emitter.completeWithError(ex)`.

SSE events are emitted via:
```java
emitter.send(SseEmitter.event().name("token").data(Map.of("text", token)));
```

---

## 10. Rate Limiting *(Deferred — post-v1)*

> Rate limiting is deferred until after v1. The design below is the intended approach; do not implement until the rest of the backend is stable.

Use Bucket4j with an in-memory bucket per user (acceptable for single-instance; move to Redis-backed buckets when scaling horizontally).

**Limits:**
- `POST /chats` and `POST /chats/{chatId}`: 30 requests per minute per user.
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

`application.properties` keys the engineer must wire:

```properties
# Datasource
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USER}
spring.datasource.password=${DATABASE_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
spring.security.oauth2.client.registration.google.scope=openid,email,profile
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/auth/callback/google
spring.security.oauth2.client.registration.google.authorization-grant-type=authorization_code

# Auth
app.auth.frontend-origin=${FRONTEND_ORIGIN}
app.auth.post-login-redirect=${FRONTEND_ORIGIN}

# Encryption
app.encryption.master-key=${API_KEY_ENCRYPTION_KEY}

# Title generation
app.title-generation.openai-api-key=${TITLE_GENERATION_OPENAI_KEY}
app.title-generation.model=gpt-4o-mini

# Chat
app.chat.memory-max-messages=100
app.chat.sse-timeout-ms=300000
app.chat.streaming-executor-pool-size=50

# Rate limiting (deferred — see §10)
app.rate-limit.chat-rpm=30
app.rate-limit.default-rpm=120
```

---

## 13. Package Layout (Suggested)

```
com.example.llmchat
├── auth/
│   ├── SecurityConfig.java
│   ├── OAuth2LoginSuccessHandler.java
│   ├── OAuth2LoginFailureHandler.java
│   ├── AuthController.java
│   ├── SessionUser.java
│   ├── UserPrincipal.java
│   ├── User.java
│   ├── UserRepository.java
│   ├── JpaUserRepository.java
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
│   └── Provider.java
├── llm/
│   ├── ChatModelFactory.java
│   ├── ChatAssistant.java
│   └── TitleGenerationService.java
├── crypto/
│   ├── CryptoService.java
│   └── EncryptedValue.java
├── common/
│   ├── GlobalExceptionHandler.java
│   ├── RateLimitInterceptor.java   (deferred — see §10)
│   └── ApiError.java
└── LlmChatApplication.java
```

---

## 14. Testing Requirements

Engineer should provide:
- **Unit tests** for `CryptoService` (encrypt/decrypt round-trip, AAD mismatch detection, tamper detection).
- **Integration tests** using Testcontainers (PostgreSQL) for:
  - Api key upsert behavior.
  - Chat creation persists user message before first token.
  - `GET /chats/{chatId}/messages` returns 404 for another user's chat.
  - Ownership checks on all chat-scoped endpoints.
- **SSE integration test** using `WebTestClient` that verifies the event sequence (`chat_created`, `token`+, `done`, `title`) for `POST /chats`. LangChain4j model calls should be mocked via a fake `StreamingChatLanguageModel` that emits a fixed token sequence.

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
