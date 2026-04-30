# `GET /chats/{chatId}/messages`

Fetches the persisted message history for a chat.

## Request

```
GET /chats/{chatId}/messages
```

### Path parameter

| Param | Type | Description |
|---|---|---|
| `chatId` | UUID | ID of the chat to fetch messages for |

---

## Authorization

The chat must belong to the authenticated user. Use `ChatService.getChat(chatId, userId)`, which calls `chatRepository.findByIdAndUserId(chatId, userId)`. If no matching chat exists (wrong owner or nonexistent), throw `ChatNotFoundException` — the controller maps this to `404`. The calling user must never be able to read another user's messages.

---

## Response

**`200 OK`**

```json
{
  "messages": [
    {
      "id": "<uuid>",
      "role": "user",
      "provider": "ANTHROPIC",
      "model": "claude-opus-4-7",
      "content": "hello world",
      "createdAt": "2026-04-24T12:00:00Z"
    },
    {
      "id": "<uuid>",
      "role": "assistant",
      "provider": "ANTHROPIC",
      "model": "claude-opus-4-7",
      "content": "Hi! How can I help?",
      "createdAt": "2026-04-24T12:00:02Z"
    }
  ]
}
```

`messages` is ordered by `created_at ASC`. All messages for the chat are returned.

---

## Implementation

### 1. `ChatService` — add `getMessages`

The existing `findByChatIdOrderByCreatedAtAsc(UUID chatId)` on `MessageRepository` already returns all messages for a chat ordered ascending — use it directly.

```java
public record MessageSummary(
    UUID id,
    String role,
    String provider,
    String model,
    String content,
    Instant createdAt
) {}

public List<MessageSummary> getMessages(UUID chatId, UUID userId) {
    getChat(chatId, userId); // authorization check — throws ChatNotFoundException if not owned

    return messageRepository.findByChatIdOrderByCreatedAtAsc(chatId)
        .stream()
        .map(m -> new MessageSummary(m.getId(), m.getRole(), m.getProvider(), m.getModel(), m.getContent(), m.getCreatedAt()))
        .toList();
}
```

### 2. `ChatController` — add `GET /chats/{chatId}/messages`

```java
@GetMapping("/chats/{chatId}/messages")
public GetChatMessagesResponse getChatMessages(
    @CurrentUserId UUID userId,
    @PathVariable UUID chatId
) {
    return new GetChatMessagesResponse(chatService.getMessages(chatId, userId));
}
```

### 3. `GetChatMessagesResponse` — new response record

```java
public record GetChatMessagesResponse(List<ChatService.MessageSummary> messages) {}
```

---

## Error Handling

| Condition | Response |
|---|---|
| `chatId` does not exist or belongs to a different user | `404` via `ChatNotFoundException` (already handled by the existing `@ExceptionHandler`) |

---

## Package Layout After Changes

```
chat/
├── ChatController.java             (add GET /chats/{chatId}/messages handler)
├── ChatService.java                (add getMessages and MessageSummary)
├── GetChatMessagesResponse.java    (new response record)
└── ...                             (all other files unchanged)
```

---

## Out of Scope

- Pagination / cursor support.
- Filtering by role (`?role=user`).
- Full-text search over message content.
- Frontend integration — tracked separately.
