# Frontend — SSE Protocol Update

## Current State vs. Required

| Area | Current | Required |
|---|---|---|
| Endpoint | `POST /chat` | `POST /chats` |
| Request shape | `{ provider, model, messages: [{role, content}] }` | `{ provider, model, content }` |
| Event dispatch | `data.type` field (`"delta"`, `"done"`, `"error"`) | SSE `event:` name (`token`, `done`, `error`, `chat_created`, `title`) |
| `parseSseRecord` | Ignores `event:` line, reads `type` from data JSON | Must read `event:` name and use it as the discriminator |
| `chat_created` | Not handled | Must capture `chatId` from data |
| `token` | Handled as `type: "delta"` | Must handle `event: token` |
| `done` payload | `{}` | `{ messageId, finishReason }` |
| `title` event | Not handled | Must capture and surface title |
| History | Built client-side from message state, sent in request | Dropped — backend hydrates from DB |

---

## SSE Event Reference (from backend)

```
event: chat_created
data: {"chatId":"<uuid>"}

event: token
data: {"text":"Hello"}

event: done
data: {"messageId":"<uuid>","finishReason":"stop"}

event: title
data: {"title":"Greeting exchange"}

event: error
data: {"message":"<description>","code":"PROVIDER_ERROR"}
```

---

## Implementation

### 1. Update `types/chat.ts`

Replace `ChatStreamRequest` and `ChatStreamEvent`:

```ts
export interface ChatStreamRequest {
  provider: ProviderId;
  model: string;
  content: string;
}

export type ChatStreamEvent =
  | { event: "chat_created"; chatId: string }
  | { event: "token"; text: string }
  | { event: "done"; messageId: string; finishReason: string }
  | { event: "title"; title: string }
  | { event: "error"; message: string; code: string };
```

### 2. Update `lib/chat-stream.ts`

**Fix URL:**
```ts
response = await fetch(`${baseURL}/chats`, { ... });
```

**Fix request body** — `chatStream` now takes `content: string` instead of `messages`. Remove history from the call.

**Fix `parseSseRecord`** — currently ignores the `event:` line. Must read it and merge it with the parsed data object:

```ts
export function parseSseRecord(record: string): ChatStreamEvent | null {
  const lines = record.split("\n");
  const eventName = lines
    .find((l) => l.startsWith("event:"))
    ?.slice(6).trim();
  const payload = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!payload || !eventName) return null;
  try {
    return { event: eventName, ...JSON.parse(payload) } as ChatStreamEvent;
  } catch {
    return { event: "error", message: `Malformed SSE event: ${payload}`, code: "PARSE_ERROR" };
  }
}
```

### 3. Update `hooks/use-chat-stream.ts`

Add `chatId` and `title` to hook state. Expose them in the return value.

**Remove** the history-building logic from `send`. The new request is just `{ provider, model, content: text }`.

**Handle all five events:**

```ts
if (event.event === "chat_created") {
  setChatId(event.chatId);
} else if (event.event === "token") {
  // append text (was "delta")
  setMessages((prev) =>
    prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.text } : m)
  );
} else if (event.event === "done") {
  setMessages((prev) =>
    prev.map((m) => m.id === assistantId ? { ...m, status: "complete", messageId: event.messageId } : m)
  );
  setStatus("idle");
  return;
} else if (event.event === "title") {
  setTitle(event.title);
} else if (event.event === "error") {
  // existing error handling, adjusted for new shape
}
```

Updated return type:
```ts
interface UseChatStreamResult {
  messages: Message[];
  status: HookStatus;
  error: string | null;
  chatId: string | null;
  title: string | null;
  send: (text: string, model: string, provider: ProviderId) => void;
}
```

### 4. Update `lib/chat-stream.test.ts`

All existing tests use the old `type` field in the data payload and ignore `event:` lines. Update them to use named events:

- `parseSseRecord` tests: add `event:` lines; assert `event` field on result instead of `type`
- `readEventStream` tests: update fixture strings to include `event:` lines
- Add a test for each new event: `chat_created`, `token`, `done`, `title`
- Add a test that a record missing an `event:` line returns `null`

---

## Out of Scope (This Iteration)

- URL routing to `/chats/:id` on `chat_created` — tracked separately.
- Displaying `title` in the sidebar `ChatHistory` — sidebar currently has no live data source; tracked separately.
- `messageId` on the `Message` type — add only if needed by another feature.
