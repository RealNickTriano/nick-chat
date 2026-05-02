# Failed Send — No Retry / Orphaned User Message

## Problem

When a message is sent and the API request to the model provider fails (network error, provider error, invalid key, etc.), the error is shown transiently in `ChatError` above the composer. On page reload the error banner is gone, leaving only the user's last message with no assistant reply — the conversation looks truncated and there is no way to resend.

### Current behavior

1. User sends a message.
2. Request to provider fails.
3. `stream_error` fires with `hadTokens: false` — the empty assistant message is removed from local state and a top-level error banner is shown.
4. User reloads. The user message was already persisted to the DB (`stream_start` dispatched before the SSE stream begins), but there is no assistant message. The chat history endpoint returns the lone user message with nothing after it.

### What's missing

- No **Retry** affordance on the error state.
- No **Re-send** option on the orphaned user message when viewing history.
- No visual cue on the orphaned message that the prior attempt failed.

## Proposed fix

### Short-term (frontend only)

- When `status === "error"`, surface a **Retry** button alongside `ChatError` that re-invokes `send()` with the last message's text, model, and provider (keep these in hook state after a failure).

### Longer-term (full fix)

- Track message-send failures in the DB so that on reload the UI knows the last user message is "awaiting a reply" rather than just incomplete.
- Show a retry affordance on the orphaned user message in the history view.
- Alternatively, don't persist the user message until the assistant reply starts (first token received), so a failed send leaves no trace in the DB.

## Affected files

- `hooks/use-chat-stream.ts` — `send()`, `stream_error` reducer case
- `components/chat/ChatError.tsx` — error banner (no retry button)
- `app/(gated)/chats/[chatId]/page.tsx` — where `ChatError` is rendered
- `app/(gated)/page.tsx` — same
- Backend: `ChatController` / message persistence (for the longer-term fix)
