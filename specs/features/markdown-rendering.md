# Markdown Rendering for Assistant Messages

## Goal

Render assistant message content as Markdown using `react-markdown` instead of plain text. User messages continue to render as plain text (they don't produce Markdown).

---

## Scope

- **In scope:** assistant messages only — the left-aligned bubble in `Message.tsx`
- **Out of scope:** user messages, the composer, error text, token/cost footer

---

## Package

Install one package:

```
react-markdown
```

No plugins needed initially. `remark-gfm` (tables, strikethrough, task lists) is a natural follow-up but should be added only if the LLMs in use produce those constructs regularly. Don't install it preemptively.

---

## Implementation

### 1. New component: `components/chat/MarkdownContent.tsx`

Extract markdown rendering into its own component so `Message.tsx` stays readable and the styling is co-located with the renderer.

```tsx
"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownContent({ content, streaming }: MarkdownContentProps) {
  return (
    <div className="prose-message">
      <ReactMarkdown components={/* see section 2 */}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-current opacity-60"
        />
      )}
    </div>
  );
}
```

The cursor span moves here from `Message.tsx` so it renders after the last Markdown node.

### 2. Custom element renderers

`react-markdown` renders React elements, not raw HTML — no XSS risk. Pass a `components` prop to apply Tailwind classes instead of browser defaults. Scope everything under a wrapper class (`prose-message`) defined in `globals.css`.

Elements to style:

| Element | Notes |
|---|---|
| `p` | `mb-3 last:mb-0` — paragraph spacing; suppress margin on the last child |
| `code` (inline) | Monospace, slightly different bg — `font-mono text-xs bg-[var(--bg3)] px-1 py-0.5 rounded` |
| `pre` | Code block wrapper — `my-3 overflow-x-auto rounded bg-[var(--bg3)] p-3` |
| `code` inside `pre` | `font-mono text-xs block` |
| `ul` | `mb-3 ml-4 list-disc space-y-1` |
| `ol` | `mb-3 ml-4 list-decimal space-y-1` |
| `li` | `text-sm leading-relaxed` |
| `h1`–`h3` | Bold, slightly larger — `font-semibold mb-2 mt-4` with decreasing sizes |
| `blockquote` | `border-l-2 border-[var(--text3)] pl-3 italic text-[var(--text2)]` |
| `a` | `text-[var(--accent)] underline` with `target="_blank" rel="noreferrer"` |
| `hr` | `my-4 border-[var(--bg3)]` |

Distinguish inline `code` from block `code` via the `node` prop: if `node.properties?.className` includes a `language-*` class it came from a fenced block.

### 3. Changes to `Message.tsx`

Replace the assistant bubble's content div:

**Before:**
```tsx
<div className="whitespace-pre-wrap break-words">
  {message.content}
  {message.status === "streaming" && <span ... />}
</div>
```

**After:**
```tsx
<MarkdownContent
  content={message.content}
  streaming={message.status === "streaming"}
/>
```

User message rendering is untouched — keep `whitespace-pre-wrap break-words`.

### 4. Streaming behavior

`react-markdown` re-parses `content` on every render. During streaming the content string grows token by token, so the component re-renders frequently. This is acceptable — `react-markdown` is fast enough for typical message lengths. No special batching needed.

One edge case: an incomplete Markdown construct at the stream boundary (e.g., a half-written fenced code block) will render as malformed text until the closing delimiter arrives. This is a known limitation of streaming Markdown and does not require a workaround at this stage. If it becomes noticeable, a deferred-parse approach (parse only when `status === "complete"`) can be added later.

### 5. Globals / CSS

Add the `.prose-message` wrapper class to `globals.css` only if scoping is needed to avoid leaking styles. Prefer inline Tailwind via `components` renderers since that keeps styling colocated and avoids specificity issues. Keep `globals.css` changes minimal.

---

## What not to do

- Do not install `remark-gfm`, `rehype-highlight`, or `rehype-raw` now — add them only when a concrete need arises.
- Do not wrap user messages in `ReactMarkdown` — user input is plain text and treating it as Markdown would break messages like "use br tags in HTML".
- Do not disable the streaming cursor — it moves into `MarkdownContent` but is otherwise unchanged.
- Do not use innerHTML manipulation at any point — `react-markdown` renders React elements directly.

---

## Acceptance criteria

1. Assistant messages render Markdown: bold, italic, inline code, fenced code blocks, lists, headings, blockquotes, and links are all formatted correctly.
2. User messages are visually unchanged.
3. The streaming cursor continues to appear at the end of in-progress messages.
4. `npm run lint` and `npm run format` pass with no new warnings.
