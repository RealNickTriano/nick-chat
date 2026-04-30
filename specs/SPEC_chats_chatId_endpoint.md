# Spec: POST /chats/{chatId}

## Overview

A streaming chat endpoint for an **existing** chat. The client calls this when it already has a `chatId` (e.g. on a follow-up message in an ongoing conversation). Unlike `POST /chats`, no new chat is created.

---

## Endpoint

```
POST /chats/{chatId}
Content-Type: application/json
Accept: text/event-stream
```

### Path parameter

| Name     | Type   | Description                      |
|----------|--------|----------------------------------|
| `chatId` | `UUID` | ID of the existing chat to use.  |

### Request body

Same `ApplicationChatRequest` as `POST /chats`.

```json
{
  "content": "string",
  "provider": "string",
  "model": "string"
}
```

### Auth

Resolved via `@CurrentUserId` — the authenticated user's `UUID`.

---

## Handler flow

1. Look up `ChatEntity` by `chatId` **and** `userId`. Return `404` if not found.
2. Call `chatService.validate(body)` to resolve provider/model. Throws `ChatValidationException` → `400`.
3. Save the user `MessageEntity` (same as `/chats`).
4. Create `SseEmitter` with `TIMEOUT_MS`.
5. Call `chatService.stream(resolved, chatEntity, body.content(), userId, emitter)`.
6. Return the emitter.

### Key difference from POST /chats

`chatService.newChat(userId)` is **not** called. The existing `ChatEntity` is fetched and passed directly to `stream()`. Everything else — message persistence, SSE streaming, title generation — is identical. Title generation inside `stream()` already no-ops when `chat.getTitle() != null`, so no changes are needed there.

---

## SSE events

Same event sequence as `POST /chats`:

| Event         | Payload                                      | Notes                                      |
|---------------|----------------------------------------------|--------------------------------------------|
| `chat_created`| `{ "chatId": "<uuid>" }`                     | Emitted for protocol symmetry.             |
| `title`       | `{ "title": "<string>" }`                    | Only if the chat has no title yet.         |
| `token`       | `{ "text": "<partial>" }`                    | One event per streamed token.              |
| `done`        | `{ "messageId": "<uuid>", "finishReason": "stop" }` | Emitted after full response saved. |
| `error`       | `{ "message": "<string>", "code": "PROVIDER_ERROR" }` | On provider failure.           |

---

## Error responses

| Status | Condition                                          |
|--------|----------------------------------------------------|
| `400`  | Invalid provider/model (`ChatValidationException`) |
| `404`  | No chat found for the given `chatId` and `userId`  |

The existing `@ExceptionHandler(ChatValidationException.class)` in `ChatController` covers the `400` case. `404` needs a new exception type or inline `ResponseEntity` return — implementation choice.

---

## What does NOT change

- `ApplicationChatRequest` — no new fields.
- `ChatService.stream()` — no changes needed.
- `ChatService.validate()` — no changes needed.
- `MessageRepository` — no changes needed.
- SSE event schema — identical to `/chats`.
