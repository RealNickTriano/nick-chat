# Multi-Chat Session Management

## Goal

Support multiple concurrent chat sessions in the UI. A user can send a message, switch to a different chat (or open a new one), send another message there, and return to the first chat to see its response — all without any session being interrupted.

---

## Mental model

Sessions live in a module-level store, not in React component state. React components are views: they subscribe to the store and render whatever the store currently holds for a given `chatId`. When you switch chats the old component unmounts, but the stream it was watching keeps running inside the store. When you return, a fresh component mounts and reads the accumulated state.

---

## The store

```ts
// lib/chat-store.ts

interface SessionState {
  id: string;
  createdAt: Date;
  messages: Message[];
  status: "idle" | "streaming" | "error";
  error: string | null;
}

interface ChatStore {
  sessions: Map<string, SessionState>;
  // Subscribe/notify for useSyncExternalStore
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => Map<string, SessionState>;
  // Mutations
  newSession: () => string;           // creates session, returns id
  send: (id: string, text: string, model: string, provider: ProviderId) => void;
  reset: (id: string) => void;
}
```

`sessions` is a plain `Map` held in a module-level variable. Every mutation calls `notify()` which fires all registered subscriber callbacks — the same pattern `useSyncExternalStore` expects. React components subscribe via the hook below and re-render when anything changes.

Streams run entirely inside `store.send()` as `async` functions that call `setState`-equivalent mutations on the store. No React lifecycle involved — the stream survives component unmount because it holds a closure over the store, not over a component.

---

## Hooks

### `useChatSession(id: string)` (`hooks/use-chat-session.ts`)

Subscribes to the store and returns the state for one session:

```ts
function useChatSession(id: string): SessionState & { send: (...) => void; reset: () => void }
```

Internally calls `useSyncExternalStore(store.subscribe, () => store.getSnapshot().get(id))`.

Components that call this hook will re-render whenever that session's state changes — including while the user is looking at a different chat, which is fine because they're unmounted.

### `useChatManager` (`hooks/use-chat-manager.ts`)

Owns `activeId` in local React state (this is purely a UI concern, not stored in the chat store). Returns:

```ts
{
  sessions: SessionState[];   // all sessions, for the sidebar list
  activeId: string;
  newChat: () => void;        // calls store.newSession(), sets activeId
  switchTo: (id: string) => void;
}
```

Lives at the layout level. `activeId` changes do not affect any running stream.

---

## Component changes

### New: `ChatPane` (`components/chat/ChatPane.tsx`)

The unit of one visible chat. Rendered by the layout for the active session only — normal mount/unmount.

```tsx
function ChatPane({ sessionId }: { sessionId: string }) {
  const { messages, status, error, send } = useChatSession(sessionId);
  // renders Conversation, ChatError, Composer
}
```

### New: `lib/chat-store.ts`

Module-level singleton. Contains the `Map<string, SessionState>`, the subscriber set, `notify()`, `newSession()`, `send()`, and `reset()`. The streaming logic currently in `use-chat-stream.ts` moves here.

### Updated: `(gated)/layout.tsx`

- Calls `useChatManager()`.
- Renders one `<ChatPane sessionId={activeId} />` (just the active one — no hidden panes).
- Passes `sessions` (converted to `Chat[]`) to `LeftSidebar`.
- Passes `activeSession.messages` to `RightSidebar`.

### Deleted: `ChatProvider`, `use-chat-stream.ts`, `(gated)/page.tsx`

`ChatProvider` and `page.tsx` are replaced by `ChatPane` + `useChatSession`. `use-chat-stream.ts` is replaced by `chat-store.ts` (the streaming logic moves into the store's `send` mutation).

### Updated: `LeftSidebar` / `ChatHistory`

Receive live `SessionState[]` from `useChatManager`, mapped to `Chat`:

```ts
session → Chat {
  id: session.id,
  title: session.messages.find(m => m.role === "user")?.content.slice(0, 60) ?? "New chat",
  createdAt: session.createdAt,
}
```

---

## Chat ID lifecycle

| Phase | ID |
|---|---|
| Session created (New Chat clicked) | `local-{uuid}` |
| First `send()` called | stream starts; backend creates a DB row but frontend doesn't track it yet |
| After `/chats` API is wired | frontend reconciles local ID → server ID |

ID reconciliation is out of scope for this spec.

---

## What is NOT changing

- Backend, SSE parsing, error handling logic — unchanged.
- All existing UI components below `ChatPane` — unchanged.

---

## Build order

1. Write `lib/chat-store.ts` — store singleton with `newSession`, `send`, `reset`, subscribe/notify.
2. Write `hooks/use-chat-session.ts` — `useSyncExternalStore` wrapper for one session.
3. Write `hooks/use-chat-manager.ts` — `activeId` React state + `newChat`/`switchTo`.
4. Write `components/chat/ChatPane.tsx`.
5. Update `(gated)/layout.tsx` — wire `useChatManager`, render `<ChatPane>`, pass sessions to sidebars.
6. Delete `ChatProvider`, `use-chat-stream.ts`, `(gated)/page.tsx`.
7. Update `LeftSidebar`/`ChatHistory` to accept live session list.
