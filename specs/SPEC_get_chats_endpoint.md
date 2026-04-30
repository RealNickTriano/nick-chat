# Spec: GET /chats

## Overview

Returns all chats belonging to the authenticated user, ordered by most recently updated. Used to populate the sidebar. Pagination is out of scope for now — all chats are returned in a single response.

---

## Endpoint

```
GET /chats
```

### Auth

Resolved via `@CurrentUserId` — the authenticated user's `UUID`.

### Request parameters

None.

---

## Handler flow

1. Call `chatService.getChats(userId)` which queries `ChatRepository.findByUserIdOrderByUpdatedAtDesc(userId)`.
2. Map each `ChatEntity` to a response DTO.
3. Return `200 OK` with the list.

---

## Response

**`200 OK`**
```json
{
  "chats": [
    {
      "id": "<uuid>",
      "title": "Some chat title",
      "createdAt": "2026-04-24T12:00:00Z",
      "updatedAt": "2026-04-24T12:30:00Z"
    },
    {
      "id": "<uuid>",
      "title": null,
      "createdAt": "2026-04-24T11:00:00Z",
      "updatedAt": "2026-04-24T11:00:00Z"
    }
  ]
}
```

- `title` is nullable — newly created chats may not have a title yet.
- Ordered by `updatedAt` descending (most recently active first).

---

## New types needed

**`ChatSummary` record** (response DTO):
```java
public record ChatSummary(UUID id, String title, Instant createdAt, Instant updatedAt) {}
```

**`GetChatsResponse` record**:
```java
public record GetChatsResponse(List<ChatSummary> chats) {}
```

---

## What changes

| Layer | Change |
|-------|--------|
| `ChatRepository` | Already has `findByUserIdOrderByUpdatedAtDesc` — no change needed. |
| `ChatService` | Add `getChats(UUID userId)` — calls the repo, maps to `List<ChatSummary>`. |
| `ChatController` | Add `GET /chats` handler returning `GetChatsResponse`. |

---

## Error responses

| Status | Condition |
|--------|-----------|
| `401` | No active session (handled globally). |
