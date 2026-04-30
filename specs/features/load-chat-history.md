# Load Chat History on Navigation

When a user navigates to `/chats/[chatId]` — by clicking a chat in the sidebar or landing directly on the URL — the conversation view should be populated with the existing message history fetched from `GET /chats/{chatId}/messages`.

## Current state

`useChatStream` starts with `messages: []` unconditionally. The `params.chatId` is read from the URL and kept in a ref for the streaming path, but no fetch happens on mount or when `chatId` changes. Navigating to an existing chat shows a blank conversation.

---

## Behavior

1. When the hook mounts with a `chatId` in the URL params, fetch the history for that chat and populate `messages`.
2. When the user navigates from one chat to another (URL `chatId` changes), clear the current messages and fetch the new chat's history.
3. While the fetch is in flight, `status` is `"loading"`. The composer is disabled and the conversation area shows a loading state.
4. If the fetch fails, set `status` to `"error"` with an appropriate error message. The user sees the same `<ChatError>` banner already used for stream errors.
5. If the `chatId` is absent (the new-chat route `/`), no fetch happens and messages stay empty as today.

---

## Implementation

### 1. `lib/chat-messages.ts` — new fetch helper

```ts
import { http } from "./http";
import type { Message } from "@/types/chat";

interface BackendMessage {
  id: string;
  role: "user" | "assistant";
  provider: string;
  model: string;
  content: string;
  createdAt: string;
}

function toMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    status: "complete",
    provider: m.provider,
    model: m.model,
    createdAt: new Date(m.createdAt),
  };
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  const res = await http.get<{ messages: BackendMessage[] }>(`/chats/${chatId}/messages`);
  return res.data.messages.map(toMessage);
}
```

### 2. `hooks/use-chat-stream.ts` — add history loading

Extend `HookStatus` with a `"loading"` state:

```ts
type HookStatus = "idle" | "loading" | "streaming" | "error";
```

Add a `useEffect` that fires when `params.chatId` changes. It clears messages, sets status to `"loading"`, fetches, then either populates messages (`"idle"`) or sets the error (`"error"`):

```ts
useEffect(() => {
  const chatId = params.chatId;
  if (!chatId) {
    setMessages([]);
    setStatus("idle");
    setError(null);
    return;
  }

  let cancelled = false;
  setMessages([]);
  setStatus("loading");
  setError(null);

  fetchChatMessages(chatId).then(
    (loaded) => {
      if (!cancelled) {
        setMessages(loaded);
        setStatus("idle");
      }
    },
    (err) => {
      if (!cancelled) {
        setError(err?.response?.data?.error ?? "Failed to load messages.");
        setStatus("error");
      }
    },
  );

  return () => {
    cancelled = true;
  };
}, [params.chatId]);
```

The `cancelled` flag prevents a stale fetch from a previous `chatId` from overwriting state after a quick navigation.

Block `send` while `status === "loading"` so the user cannot submit before history arrives. The composer is already disabled when `status === "streaming"` — extend that check to include `"loading"`:

In `app/(gated)/chats/[chatId]/page.tsx`:
```tsx
<Composer
  onSubmit={({ text, model, provider }) => send(text, model, provider)}
  disabled={status === "streaming" || status === "loading"}
/>
```

### 3. `components/chat/Conversation.tsx` — loading state

Pass `status` down to `Conversation` and render a skeleton or spinner when `status === "loading"`. Inspect the current `Conversation` implementation before choosing the exact treatment, but the simplest acceptable approach is a centered `<TypingIndicator />` (already used for streaming) inside the scroll area.

---

## Types

Add `provider`, `model`, and `createdAt` to the `Message` interface in `types/chat.ts`:

```ts
export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  error?: string;
  provider?: string;
  model?: string;
  createdAt?: Date;
}
```

All three are optional so that optimistically-appended messages (created client-side during streaming before the server assigns them) don't require values. `BackendMessage` stays internal to `chat-messages.ts`.

---

## Error handling

| Condition | Behavior |
|---|---|
| `chatId` in URL but chat does not exist or belongs to another user | Backend returns `404`; frontend sets `status: "error"`, `error: "Failed to load messages."` |
| Network failure | Same as above |
| Navigation away before fetch resolves | `cancelled = true` swallows the result; no state update |

---

## Out of scope

- Merging newly streamed messages with history (the stream appends to `messages` state, which already contains history — this works without changes).
- Refetching history after a page is already loaded (not needed; streamed messages are appended live).
- Pagination (history always returns all messages).
