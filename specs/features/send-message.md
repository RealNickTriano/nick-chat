# Send Message

The user submits a message in the composer; the frontend forwards it to the backend, which routes the request to the correct provider for the chosen model and streams the assistant's reply back. Tokens render into the conversation as they arrive.

This spec covers everything between the composer's `onSubmit` event and the assistant's reply landing in the conversation view. It does **not** cover persistence, multi-conversation management, or stop-generating UI — see "Out of scope".

## Goal

Get a streamed reply from the right model with the smallest reasonable surface area. One endpoint, one stream protocol, one frontend hook. The user's message appears immediately on submit; the assistant's reply streams in token-by-token. If anything fails, the user sees what happened and can retry.

## Shape

```
┌────────────────────┐       POST /chat (SSE)        ┌────────────────────┐       provider SDK        ┌──────────┐
│  Composer.onSubmit │ ────────────────────────────▶ │  ChatController    │ ────────────────────────▶ │ Provider │
│  { text, model }   │ ◀──────────────────────────── │  (routes by model) │ ◀──────────────────────── │  (LC4j)  │
└────────────────────┘   stream of token deltas      └────────────────────┘     stream of tokens      └──────────┘
         │
         ▼
   Conversation view appends the user message, then the streaming assistant message.
```

The frontend never picks a provider — it sends a model id. The backend looks the model up and dispatches to the right provider client.

## Backend contract

### Endpoint

- `POST /chat` — Server-Sent Events response.
- Request body:
  ```json
  {
    "model": "claude-opus-4-7",
    "messages": [
      { "role": "user", "content": "Hello!" },
      { "role": "assistant", "content": "Hi — how can I help?" },
      { "role": "user", "content": "Tell me a joke." }
    ]
  }
  ```
- Response: `text/event-stream`. Each event is a JSON object on a single `data:` line:
  - `{ "type": "delta", "text": "..." }` — a chunk of assistant text. Multiple per response.
  - `{ "type": "done" }` — the stream finished cleanly. The connection then closes.
  - `{ "type": "error", "message": "..." }` — the provider call failed. Connection closes after.

### Server behavior

- **Stateless.** Every request carries the full message history. The server does not remember prior turns.
- **Provider resolution.** A `ChatService` maps `model` → provider client (LangChain4j `ChatLanguageModel` / `StreamingChatLanguageModel`). The same `ModelCatalog` that powers `/catalog` is the source of truth.
- **One endpoint, all providers.** No `/chat/openai`, `/chat/anthropic` routes. Routing is server-side based on the model id.
- **Validation.** If the model id isn't in the catalog, return HTTP 400 with a JSON error body — do not open the SSE stream.
- **Provider keys** live in `application.properties` (or env). Out of scope for this spec; just a precondition.
- **CORS** stays scoped to the dev frontend origin, same as the catalog endpoints today.

### Why SSE over chunked plain text or WebSockets

- SSE is one-way (server → client) which is exactly what we need.
- Spring Boot supports it cleanly via `Flux<ServerSentEvent<String>>`.
- It's the same shape the OpenAI/Anthropic streaming APIs use, so adapting LangChain4j stream callbacks is straightforward.
- WebSockets are bidirectional overhead we don't need.
- Plain chunked text would force us to invent a framing protocol; SSE already has one.

## Frontend behavior

### Submit flow

1. Composer fires `onSubmit({ text, model })`.
2. Page (or chat container) appends a `user` message to the conversation immediately. Renders right away — no waiting on the network.
3. Page appends a placeholder `assistant` message with empty `content` and `status: "streaming"`.
4. Hook opens the SSE stream. Each `delta` appends to the placeholder's `content`. The `done` event flips status to `"complete"`. The `error` event flips status to `"error"` and stores the message.
5. Once the assistant message is `complete` or `error`, the user can submit again. The composer remains editable throughout (per the composer spec).

### Component breakdown

- `lib/chat-stream.ts` — pure async generator that takes `{ model, messages }` and yields `{ type, ... }` events. Uses `fetch` (not axios) so it can read the `Response.body` `ReadableStream` directly. This is the documented exception in `specs/guidelines/frontend.md`.
- `hooks/use-chat-stream.ts` — React hook that owns the conversation state. Exposes `{ messages, send, status, error }`. `send(text, model)` appends the user message and starts the stream. Internal state machine: `idle` → `streaming` → (`idle` | `error`).
- `components/chat/Conversation.tsx` — renders the message list. Replaces the inline `<ul>` currently in `app/page.tsx`.
- `components/chat/Message.tsx` — single message bubble. Variants for `user` and `assistant`. Shows a subtle "..." or cursor while `status: "streaming"`.
- `app/page.tsx` — wires `useChatStream()` into `<Conversation />` + `<Composer />`. Passes `send` to the composer.

### Types

```ts
// types/chat.ts
export type Role = "user" | "assistant";
export type MessageStatus = "complete" | "streaming" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  error?: string;
}
```

Generate `id` client-side (e.g. `crypto.randomUUID()`) — the backend doesn't assign ids.

### Streaming consumption

- The `chat-stream.ts` generator reads `response.body` as a `ReadableStream<Uint8Array>`, decodes via `TextDecoder`, splits on `\n\n` (SSE record boundary), and parses each `data:` line as JSON.
- Network or parse errors yield a synthetic `{ type: "error", message }` event so consumers handle one shape.
- The hook awaits each event and updates state with a functional setter so React batches don't drop deltas.

### Send button while streaming

- Composer's `disabled` prop is set to `true` while `status === "streaming"`. The user can still type a draft (per the composer spec) but cannot submit a second turn until the current one finishes.

## Errors

- **Validation error (HTTP 400)** — show inline above the composer ("Unknown model"). The placeholder assistant message is removed.
- **Network error or stream interruption** — flip the placeholder assistant message to `status: "error"` and render its `error` text inline in the bubble. The conversation history stays intact.
- **Provider error mid-stream** (`{ "type": "error", ... }`) — same handling as a stream interruption: keep partial text already streamed, mark as error, store message.
- **Retry** — out of scope for v1. The user can resend the same prompt manually.

## Accessibility

- The assistant bubble is in an `aria-live="polite"` region (same region used for the message list per the frontend guidelines) so streaming text is announced.
- Errors are announced once, not on every token.
- Streaming indicator (cursor / dots) is `aria-hidden`; the streaming state is communicated through live region updates, not the cursor.

## Out of scope (for this spec)

- **Persistence** — the conversation lives in component state and disappears on reload. A separate spec covers chat history.
- **Multiple conversations** — single thread on the page for now.
- **Stop-generating button** — flagged in the composer spec as a separate component. The SSE stream supports client disconnect (closing the `ReadableStream`); wiring that to a button is a follow-up.
- **System prompts, tool calls, file attachments, image input** — not in v1.
- **Token usage / cost reporting** — could come back through `done` events later; not now.
- **Rate limiting, retries, backoff** — handle when the provider actually pushes back, not preemptively.
- **Backend authentication** — single-user dev assumption. Auth is its own spec when it's needed.

## Resolved decisions

- **Streaming protocol: SSE.** Single one-way text/event-stream with JSON-per-event. Not WebSockets, not chunked plain text.
- **Stateless backend.** Client sends the full message history every turn.
- **Server-side provider routing.** Frontend only sends a model id; backend looks up the provider from the catalog.
- **Single `/chat` endpoint.** No per-provider routes.
- **`fetch` for the stream, axios for everything else.** Already documented as the exception in the frontend guidelines.
- **Client generates message ids.** Server doesn't assign or persist them.
- **Composer stays editable while streaming, but submit is blocked.** Matches the existing composer spec.
- **Send the canonical model id to the provider.** The catalog's `id` field (e.g. `claude-opus-4-7`) is what gets forwarded — never the `displayName`.
- **Stream idle timeout: 5 minutes.** Generous on purpose for v1; tune down once we have real provider behavior to base it on.
