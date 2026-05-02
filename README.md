# All Chat

A self-hosted, multi-provider LLM chat app. Users sign in with Google, store their own API keys per provider, and chat with models from OpenAI, Anthropic, Google, and Mistral via SSE streaming.

## Features

- Google OAuth sign-in
- Per-user, per-provider API key storage (AES-256-GCM encrypted at rest)
- Streaming chat responses via SSE
- Automatic chat title generation (GPT-4o-mini)
- Markdown rendering with syntax highlighting
- Persistent chat and message history
- Multi-provider model catalog (OpenAI, Anthropic, Google Gemini, Mistral)

## Tech Stack

**Backend**
- Java 21 / Spring Boot 4
- LangChain4j 1.13 — streaming model abstraction across providers
- Spring Security OAuth2 — Google sign-in and session management
- Spring Data JPA + PostgreSQL 16
- Flyway — schema migrations
- Lombok

**Frontend**
- Next.js 16 / React 19
- Tailwind CSS 4
- `react-markdown` + `remark-gfm` + `rehype-highlight` — message rendering
- Axios — API client

**Infrastructure**
- PostgreSQL via Docker Compose

## Project Structure

```
nick-chat/
├── backend/                  Spring Boot app
│   └── src/main/java/dev/nicktriano/model_selector_demo/
│       ├── auth/             Google OAuth, session, @CurrentUserId
│       ├── apikey/           Provider key CRUD
│       ├── chat/             SSE streaming, message persistence, title generation
│       ├── models/           GET /models — per-provider model catalog
│       ├── model/            LangChain4j streaming model builder
│       └── crypto/           AES-256-GCM key encryption
├── frontend-nextjs/          Next.js app
│   ├── app/                  App router pages
│   ├── components/           UI components
│   ├── hooks/                use-auth, use-chat-stream, use-theme
│   └── lib/                  API clients and utilities
├── specs/                    Design docs and feature specs
└── docker-compose.yml        PostgreSQL
```

## Getting Started

### Prerequisites

- Java 21
- Node.js 20+
- Docker

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure backend environment

Create `backend/.env` with:

```
OPEN_AI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
MISTRAL_API_KEY=
TITLE_GENERATION_OPENAI_KEY=
ENCRYPTION_MASTER_KEY=          # 32-byte base64 key for AES-256-GCM
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_AUTH_FRONTEND_ORIGIN=http://localhost:3000
APP_AUTH_POST_LOGIN_REDIRECT=http://localhost:3000
```

Load the env vars and start the backend:

```bash
export $(grep -v '^#' backend/.env | xargs)
cd backend && ./mvnw spring-boot:run
```

### 3. Start the frontend

```bash
cd frontend-nextjs && npm install && npm run dev
```

The app runs at `http://localhost:3000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/me` | Current user session |
| `POST` | `/auth/logout` | Sign out |
| `POST` | `/apiKeys` | Save a provider API key |
| `GET` | `/apiKeys` | List saved providers |
| `DELETE` | `/apiKeys/{provider}` | Remove a provider key |
| `GET` | `/models` | Available models per provider |
| `POST` | `/chats` | Create chat and stream first response |
| `POST` | `/chats/{chatId}` | Send message, stream response |
| `GET` | `/chats` | Chat list |
| `GET` | `/chats/{chatId}/messages` | Message history |
