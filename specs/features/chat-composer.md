# Chat Composer

The input surface the user types into to send a message. Owns its own draft text and toolbar state; emits a single event to its parent on submit.

## Goal

Give the user a fast, focused place to compose and send a message, and to pick which model the message goes to — without leaving the composer.

## Shape

```
┌─────────────────────────────────────────────┐
│  [multiline textarea, auto-growing]         │
│                                             │
├─────────────────────────────────────────────┤
│  [model selector ▾]            [Send ▶]     │
└─────────────────────────────────────────────┘
```

One component. The textarea is the primary surface; the toolbar sits flush along the bottom, visually part of the same container.

## Component breakdown

Three components, each in its own file. Keep each one small so styling is easy to locate.

- `components/chat/Composer.tsx` — the composer shell. Owns draft text, selected model, auto-resize, submit logic. Composes the other two.
- `components/chat/ModelSelector.tsx` — the dropdown in the toolbar. Pure controlled component: takes `value` + `onChange` + the list of available models. No knowledge of the composer. Internally composes:
  - `components/chat/ModelSelectorButton.tsx` — the trigger button shown in the toolbar. Takes `label`, `open`, `onClick`, and a forwarded `ref`. Isolated so the button's styling lives in one obvious place.
- `components/chat/SendButton.tsx` — just the submit button. Takes `onClick` + `disabled`. Trivially small on purpose — styling for the primary submit affordance should live in one obvious place.

All three are client components (`"use client"`).

## Composer API

**Props**

- `onSubmit(payload: { text: string; model: ModelId; provider: ProviderId }): void` — called when the user submits a non-empty message. Parent decides what to do with it (append to chat, send over network, etc.). The composer emits `provider` alongside `model` so the parent can forward both to the backend without re-looking up the catalog (see `send-message.md`).
- `disabled?: boolean` — when true, typing is allowed but submit is blocked. Used by the parent while a response is streaming.
- `initialModel?: ModelId` — the model selected on first render. Defaults to the app-level default.
- `placeholder?: string` — textarea placeholder. Has a sensible default.

**What the composer owns internally**

- The draft text (the textarea value).
- The currently selected model.
- Focus state, auto-resize state.

The parent does **not** control draft text or selected model. The composer is self-contained; it only reports out via `onSubmit`.

## ModelSelector API

- `value: ModelId` — currently selected model.
- `onChange(next: ModelId): void` — fires when the user picks a different model.
- `models: Model[]` — the list to display (grouped by provider at render time).

No internal persistence — it's a controlled input.

## SendButton API

- `onClick(): void`
- `disabled?: boolean`

That's it. One button, one file, so restyling the primary submit affordance is a single-file change.

## Behavior

**Submitting**

- Clicking the Send button submits.
- Pressing `Enter` submits.
- Pressing `Shift+Enter` inserts a newline (does not submit).
- Submit is a no-op if the trimmed draft is empty, or if `disabled` is true.
- On successful submit, the textarea is cleared and refocused. Selected model is preserved across sends.

**Model selector**

- Rendered as a dropdown/menu in the toolbar.
- Lists available models grouped by provider (e.g. Anthropic → Claude Opus 4.7, Sonnet 4.6; OpenAI → ...). The available model list comes from a shared source (TBD — likely `lib/models.ts`); the composer consumes, doesn't define it.
- The selected model persists for the session (and later, across sessions — out of scope for this spec).

**Auto-resize**

- Textarea grows with content up to a max height (roughly 10 lines). Past that it scrolls internally.
- Shrinks back when content shortens.

**Disabled state**

- When `disabled`, the Send button is visually disabled and submits are blocked. The textarea remains editable so the user can draft their next message while the previous one streams.

## Accessibility

- Textarea has a visible or `aria-label`ed label.
- Send button is a real `<button type="button">` with an accessible name ("Send message").
- Model selector is keyboard-navigable (arrow keys, Enter to select, Escape to close).
- Focus ring is visible on all interactive elements in both themes.

## Styling

- Tailwind utilities. Uses semantic tokens (`bg-surface`, `border-subtle`, etc.) so dark/light theming is automatic.
- The composer container has rounded corners and a single border; the toolbar is separated from the textarea by a 1px divider, not a gap.

## Out of scope (for this spec)

- Where the composer is mounted / the surrounding chat layout.
- Persisting the selected model across sessions.
- File attachments, slash commands, mentions, voice, image input.
- Streaming response rendering — the composer fires and forgets; the parent handles the response.
- The model list source of truth — assumed to exist; this spec only consumes it.

## Resolved decisions

- **Cmd+K focus shortcut: deferred.** Nice-to-have, not part of this spec. Revisit later.
- **Stop-generating button: not in the composer.** It will be elevated to a separate component outside the composer's concern.
