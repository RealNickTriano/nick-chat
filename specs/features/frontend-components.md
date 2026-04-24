# Frontend Component Plan

Source design: `specs/design/Multi-Agent Chat.html`
Project: `frontend-nextjs` — Next.js 16, React 19, Tailwind v4, TypeScript

---

## 1. Foundational Changes

These must land before any new components are built.

### 1a. Dark mode strategy (`app/globals.css`)

Currently dark mode relies on `prefers-color-scheme`. The design has a manual toggle. Switch to class-based dark mode in Tailwind v4 by adding one line to `globals.css`, then adding the custom color variables:

```css
@import "tailwindcss";

/* enable dark: variants when .dark is on <html> */
@variant dark (&:is(.dark, .dark *));

:root {
  --bg:           oklch(98% 0.005 80);
  --bg2:          oklch(96% 0.006 80);
  --bg3:          oklch(93% 0.007 80);
  --border:       oklch(88% 0.008 80);
  --text:         oklch(14% 0.01 260);
  --text2:        oklch(44% 0.01 260);
  --text3:        oklch(64% 0.01 260);
  --accent:       oklch(52% 0.14 252);
  --accent-light: oklch(94% 0.04 252);
  --agent-a:      oklch(52% 0.14 252);   /* OpenAI — blue   */
  --agent-b:      oklch(52% 0.14 170);   /* Anthropic — green */
  --agent-c:      oklch(52% 0.14 30);    /* Google — orange  */
}

.dark {
  --bg:           oklch(13% 0.008 260);
  --bg2:          oklch(17% 0.009 260);
  --bg3:          oklch(21% 0.01 260);
  --border:       oklch(26% 0.01 260);
  --text:         oklch(94% 0.006 80);
  --text2:        oklch(66% 0.008 260);
  --text3:        oklch(48% 0.008 260);
  --accent:       oklch(62% 0.14 252);
  --accent-light: oklch(22% 0.06 252);
  --agent-a:      oklch(62% 0.14 252);
  --agent-b:      oklch(62% 0.14 170);
  --agent-c:      oklch(62% 0.14 30);
}
```

Components reference these via Tailwind arbitrary values: `bg-[var(--bg)]`, `text-[var(--text2)]`, etc. Existing `dark:bg-neutral-*` classes on existing components should be migrated to the new variables as each component is updated.

### 1b. Font swap (`app/layout.tsx`)

Replace Geist / Geist Mono with DM Sans + DM Mono from `next/font/google`. The design's typography relies on DM Sans's proportions and DM Mono's tabular numbers for stats.

### 1c. `useTheme` hook (`hooks/use-theme.ts`)

```ts
// Toggles .dark on <html>, persists to localStorage.
// Returns [isDark, toggle].
export function useTheme(): [boolean, () => void]
```

Reads initial state from localStorage on mount (falls back to `prefers-color-scheme`).

### 1d. Layout overhaul (`app/(gated)/layout.tsx`)

Current layout constrains to `max-w-4xl` centered. The new layout is a full-viewport three-column flex row with no max-width. The `(gated)` layout becomes the three-column shell:

```
┌──────────────┬────────────────────────┬──────────────┐
│  LeftSidebar │       main             │  RightSidebar│
│  240px       │       flex-1           │  260px       │
└──────────────┴────────────────────────┴──────────────┘
```

Both sidebars animate to `width: 0` with `transition-[width,min-width]` when collapsed. Their inner content is fixed-width inside the collapsing container so it slides out cleanly.

---

## 2. New SVG Icons (`components/svg/`)

Already present: `ChevronDown`, `Close`, `Check`, `ArrowRight`, `AnthropicLogo`, `OpenAILogo`

Add:

| File | Shape |
|------|-------|
| `Plus.tsx` | + |
| `Search.tsx` | magnifying glass |
| `ChevronLeft.tsx` | ‹ |
| `ChevronRight.tsx` | › |
| `Send.tsx` | paper plane |
| `User.tsx` | person outline |
| `BarChart.tsx` | vertical bars |
| `Moon.tsx` | crescent |
| `Sun.tsx` | sun with rays |
| `Settings.tsx` | gear |
| `Trash.tsx` | trash can |
| `Layers.tsx` | stacked layers |

All props: `size?: number`, `className?: string`. All strokes use `currentColor`.

---

## 3. New Components

### Left Sidebar

#### `LeftSidebar` (`components/layout/LeftSidebar.tsx`)
Props: `open`, `onToggle`, `chats`, `activeChatId`, `onSelectChat`, `onNewChat`

Sections top to bottom:
1. Header — "AllChat" wordmark + `ChevronLeft` collapse button
2. New Chat — full-width accent button (`Plus` icon)
3. Search — controlled input with inset `Search` icon
4. Chat history — grouped `Today / Yesterday / Earlier` with uppercase section labels; delegates each row to `ChatHistoryItem`
5. User banner — avatar circle + display name + `Settings` button; reads from `useAuth`

#### `ChatHistoryItem` (`components/layout/ChatHistoryItem.tsx`)
Props: `chat: Chat`, `active: boolean`, `onClick`

Single row. Truncates title with `truncate`. Active: `bg-[var(--accent-light)] text-[var(--accent)] font-medium`.

---

### Right Sidebar

#### `RightSidebar` (`components/layout/RightSidebar.tsx`)
Props: `open`, `onToggle`, `messages: Message[]`

Derives all stats from `messages` — no separate state. Sections:
1. Header — `ChevronRight` + "Session Stats" label
2. Summary — `StatRow` ×3: Total Tokens, Estimated Cost, Agents Active
3. Per-model breakdown — `PerModelCard` per active model
4. Latency — `LatencyBar` per model
5. Footer — "Clear session data" destructive button

#### `StatRow` (`components/layout/StatRow.tsx`)
Props: `label`, `value`, `sub?`, `accentColor?`

Three-line stacked block: uppercase muted label → large mono value (colored if `accentColor`) → small muted subline. Bottom border separates rows.

#### `PerModelCard` (`components/layout/PerModelCard.tsx`)
Props: `label`, `color`, `tokens`, `cost`, `totalTokens`

Dot + label, 2-col mini stat grid (Tokens / Cost in `bg-[var(--bg2)]` boxes), 3px proportional bar.

#### `LatencyBar` (`components/layout/LatencyBar.tsx`)
Props: `label`, `ms`, `maxMs`, `color`

Label (fixed width) → thin filled bar → mono ms value right-aligned.

---

### Chat Area

#### `TopBar` (`components/layout/TopBar.tsx`)
Props: `title`, `subtitle?`, `leftOpen`, `rightOpen`, `onToggleLeft`, `onToggleRight`

Replaces the current `Header`. Sticky top bar containing:
- `ChevronRight` button (only when left sidebar is collapsed)
- Chat title + subtitle (model count / agent mode)
- `Moon`/`Sun` dark mode toggle (uses `useTheme`)
- `BarChart` button (only when right sidebar is collapsed)

`Header.tsx` can be deleted once `TopBar` is wired in.

#### `AgentAvatar` (`components/chat/AgentAvatar.tsx`)
Props: `providerId: ProviderId`, `size?: number`

Colored circle keyed to provider: `--agent-a` for OpenAI, `--agent-b` for Anthropic, `--agent-c` for Google. 2-char initials in DM Mono. `shrink-0` to prevent squishing in flex rows.

#### `TypingIndicator` (`components/chat/TypingIndicator.tsx`)
Props: `providerId: ProviderId`

`AgentAvatar` + bubble containing three bouncing dots. Same bubble shape as agent messages. CSS keyframe animation with staggered `animation-delay` per dot.

---

## 4. Existing Components to Update

#### `Message` → update in place
Add the agent bubble variant from the design:
- **User**: stays right-aligned, switch colors to `bg-[var(--accent)] text-white`
- **Agent**: left-aligned with `AgentAvatar` left, provider label (colored mono) + timestamp above bubble, token/cost footer below. Bubble background `bg-[var(--bg2)]`.

The `Message` type in `types/chat.ts` needs `providerId?: string` and optional `tokens`/`cost` fields.

#### `Conversation` → update in place
- Add `typingProviderId?: ProviderId` prop; render `TypingIndicator` as the last item when set
- Update scroll container colors to use `--border` scrollbar

#### `Composer` → update in place
- Outer border: `border-[var(--border)] bg-[var(--bg)]`
- Textarea: `text-[var(--text)] placeholder:text-[var(--text3)]`
- Toolbar divider: `border-[var(--border)]`
- `SendButton`: accent when active, muted when disabled

#### `ModelSelector` → keep logic, restyle trigger
The existing selector fetches from the backend catalog and handles localStorage persistence — keep all of that. Only change is the trigger button: replace `ModelSelectorButton` with a pill showing a colored provider dot + label + `ChevronDown`. The modal can be updated incrementally.

---

## 5. Updated Type Definitions

#### `types/chat.ts` — add fields to `Message`
```ts
export interface Message {
  id: string;
  role: Role;
  content: string;
  status: MessageStatus;
  error?: string;
  providerId?: string;   // which agent sent this
  tokens?: number;
  cost?: number;
}
```

#### `types/chat.ts` — add `Chat`
```ts
export interface Chat {
  id: string;
  title: string;
  time: string;          // "Today" | "Yesterday" | day-of-week
}
```

---

## 6. File Structure After Changes

```
app/
  globals.css              ← add CSS vars + @variant dark
  layout.tsx               ← swap font to DM Sans / DM Mono
  (gated)/
    layout.tsx             ← three-column shell with LeftSidebar + RightSidebar
    page.tsx               ← no change

components/
  svg/
    (existing)
    Plus.tsx
    Search.tsx
    ChevronLeft.tsx
    ChevronRight.tsx
    Send.tsx
    User.tsx
    BarChart.tsx
    Moon.tsx
    Sun.tsx
    Settings.tsx
    Trash.tsx
    Layers.tsx
  auth/                    ← no changes
  chat/
    AgentAvatar.tsx        ← new
    TypingIndicator.tsx    ← new
    ChatError.tsx          ← no change
    Composer.tsx           ← restyle
    Conversation.tsx       ← add typingProviderId prop
    Message.tsx            ← add agent variant
    ModelSelector.tsx      ← restyle trigger only
    (others unchanged)
  layout/
    ChatHistoryItem.tsx    ← new
    Header.tsx             ← delete after TopBar is wired
    LatencyBar.tsx         ← new
    LeftSidebar.tsx        ← new
    PerModelCard.tsx       ← new
    RightSidebar.tsx       ← new
    StatRow.tsx            ← new
    TopBar.tsx             ← new

hooks/
  use-auth.ts              ← no change
  use-chat-stream.ts       ← no change
  use-theme.ts             ← new

types/
  chat.ts                  ← extend Message; add Chat
  model.ts                 ← no change
  user.ts                  ← no change
```

---

## 7. Build Order

1. CSS variables + `@variant dark` + font swap + `useTheme`
2. New SVG icons
3. `AgentAvatar`, `StatRow`, `LatencyBar`, `PerModelCard`, `ChatHistoryItem` — leaf components, no children deps
4. Update `Message` (agent variant) + `TypingIndicator`
5. Update `Conversation` (typing prop) + `Composer` (restyle)
6. `TopBar`, `LeftSidebar`, `RightSidebar`
7. Overhaul `(gated)/layout.tsx` — wire the three-column shell
8. Delete `Header.tsx`

---

## 8. Out of Scope

- **Multi-agent backend**: `use-chat-stream` currently sends to one model. Parallel agent responses require a new backend endpoint and hook. The UI components (`AgentAvatar`, `TypingIndicator`, multi-bubble layout) are being built to support it, but the hook wiring is a separate feature.
- **Chat history persistence**: `LeftSidebar` will be built with mock data; wiring to a `/chats` API is a follow-on task once the backend exposes it.
- **Session stats data**: `RightSidebar` derives from `messages` for now. Real token/cost/latency data requires the backend to return it per response.
