# nick-chat

A multi-provider LLM chat app. Users authenticate with Google OAuth, store per-provider API keys, and chat with LLMs via SSE streaming.

**Stack:** Spring Boot 4 / Java 21 (backend) · Next.js (frontend) · PostgreSQL · LangChain4j · Flyway

---

## Repo Layout

```
nick-chat/
├── backend/                  Spring Boot app
├── frontend-nextjs/          Next.js app
├── specs/                    Design docs and feature specs
│   ├── guidelines/
│   │   └── backend-system-design.md   Authoritative backend spec (read this first)
│   └── features/             Per-feature implementation specs
├── docker-compose.yml        Runs PostgreSQL locally
└── commands.txt              Handy dev commands
```

---

## Backend (`backend/`)

**Entry point:** `src/main/java/dev/nicktriano/model_selector_demo/`

| Package | What's in it |
|---|---|
| `auth/` | Google OAuth2, session handling, `@CurrentUserId` resolver |
| `apikey/` | CRUD for encrypted provider API keys |
| `chat/` | SSE streaming chat, message persistence, title generation |
| `models/` | `GET /models` — per-provider model catalog |
| `model_selector/` | Old `/catalog` prototype — being replaced by `models/` |
| `model/` | `StreamingChatModelBuilder` — builds LangChain4j streaming models |
| `crypto/` | AES-256-GCM encrypt/decrypt for stored API keys |
| `config/` | Jackson, JPA auditing, WebMvc config |
| `common/` | Global exception handler, error response shape |

**Key files:**
- `application.properties` — all env-var-backed config
- `src/main/resources/db/migration/` — Flyway migrations (V1–V4: users, api_keys, chats, messages)

**Provider enum:** LangChain4j's `ModelProvider` (`OPEN_AI`, `ANTHROPIC`, `GOOGLE_AI_GEMINI`, `MISTRAL_AI`) — used throughout instead of a custom enum.

---

## Frontend (`frontend-nextjs/`)

| Path | What's in it |
|---|---|
| `app/` | Next.js app router pages |
| `components/` | UI components (`api-keys/`, `auth/`, `chat/`, `layout/`, `svg/`) |
| `hooks/` | `use-auth`, `use-chat-stream`, `use-theme` |
| `lib/` | API clients and utilities (`catalog.ts`, `chat-stream.ts`, `api-keys.ts`, etc.) |
| `types/` | Shared TypeScript types (`model.ts`, `chat.ts`, `user.ts`) |

**Conventions:**
- Component files are PascalCase (`Composer.tsx`); non-component `.ts` files are kebab-case
- SVG icons live in `components/svg/`, never inlined
- Each `ProviderLogo` branch sets its own `className`

**After every frontend change:** run `npm run lint` and `npm run format` from `frontend-nextjs/`.

---

## Completed Endpoints

| Endpoint | Notes |
|---|---|
| `GET /auth/me`, `POST /auth/logout` | Session auth |
| `POST /apiKeys`, `GET /apiKeys`, `DELETE /apiKeys/{provider}` | Key management |
| `POST /chats`, `POST /chats/{chatId}` | SSE streaming chat |
| `GET /chats` | Chat list with cursor pagination |
| `GET /chats/{chatId}/messages` | Message history |

**In progress:** `GET /models` — see `specs/features/get-models-endpoint.md`
