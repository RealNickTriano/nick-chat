# Model Selection

The user picks which model their next message goes to. Two parts:

1. **Data** — the frontend pulls the available models from the backend instead of a hardcoded list.
2. **Modal redesign** — the picker becomes a marketplace-style surface, grouped by provider, with each section headed by the provider's logo.

The trigger button (in the composer toolbar) and the open/close mechanics are already built; this spec replaces the placeholder catalog and restyles the modal body.

## Goal

Make model selection feel like browsing a small marketplace of LLMs, not flipping through a config dropdown. The user should immediately see which provider a model belongs to, and the list should reflect what the backend actually offers — not a hand-edited frontend constant.

## Data layer

### Backend contract

The legacy `frontend/` already calls the same backend; reuse the same endpoint:

- `GET http://localhost:8080/catalog/chat-only` — returns `ModelDescription[]`, filtered to chat-capable, non-snapshot models.

Response shape (one element):

```ts
interface ModelDescription {
  name: string;            // canonical id, e.g. "gpt-4o"
  displayName: string;     // human label, e.g. "GPT-4o"
  description: string | null;
  provider: ModelProvider; // "OPEN_AI" | "ANTHROPIC" | "GOOGLE" | "MISTRAL" | string
  type: ModelType | null;  // "CHAT" | "EMBEDDING" | "LANGUAGE" | string
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  createdAt: string;       // ISO-8601
  owner: string;
}
```

The base URL belongs in an env var (`NEXT_PUBLIC_API_BASE_URL`, default `http://localhost:8080` in dev). No hardcoded `localhost:8080` in component code.

### Frontend types

Per the frontend guidelines, all shared types live under `types/`. Move the current `Model` shape out of `lib/models.ts` into `types/model.ts`, and shrink it to mirror the backend payload — only the fields the UI actually renders today:

```ts
// types/model.ts
export type ProviderId = "OPEN_AI" | "ANTHROPIC" | "GOOGLE" | "MISTRAL" | (string & {});

export interface Model {
  id: string;            // = backend `name`
  label: string;         // = backend `displayName`
  provider: ProviderId;  // = backend `provider`
  description: string | null;
}
```

`lib/` keeps the runtime helpers — `providerLabel(provider): string` mapping `"OPEN_AI" → "OpenAI"`, etc. — but no type definitions.

### Fetching

- Use the shared axios client (per `specs/guidelines/frontend.md`).
- **Fetch once per page load.** Cache the result at module scope (or in a React context above the chat surface) so subsequent mounts of the composer or modal read from the cache, not the network.
- Single in-flight request: dedupe so opening the modal doesn't trigger a second call while the first is pending.
- States the modal must render: **loading**, **error**, **empty**, **loaded**.

### Default selection

The backend list isn't known at compile time, so `DEFAULT_MODEL_ID` can't be a constant. Strategy:

1. If a previously selected model id is in `localStorage` and still present in the catalog, use it.
2. Otherwise pick the first model in a configured priority list (e.g. preferred Anthropic id, then OpenAI), if present.
3. Otherwise fall back to the first model returned.

Persistence across sessions is **in scope** for this spec (it was deferred in the composer spec; this is the right home for it).

## Modal redesign

The current modal is a flat list with a tiny provider label per section. The new one should feel like a marketplace listing:

```
┌──────────────────────────────────────────────────────┐
│  Select a model                                  [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│   ╭─ ANTHROPIC LOGO ─╮                               │
│                                                      │
│   ┌───────────────────┐  ┌───────────────────┐       │
│   │ Claude Opus 4.7   │  │ Claude Sonnet 4.6 │  ...  │
│   │ short description │  │ short description │       │
│   │ 200k ctx          │  │ 200k ctx          │       │
│   └───────────────────┘  └───────────────────┘       │
│                                                      │
│   ╭─ OPENAI LOGO ─╮                                  │
│                                                      │
│   ┌───────────────────┐  ┌───────────────────┐       │
│   │ GPT-5             │  │ GPT-4o            │  ...  │
│   └───────────────────┘  └───────────────────┘       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Sections

- One section per provider. Order is not specified for now — render in whatever order providers appear in the backend response (revisit later).
- Section header is the provider's **logo** when we have an asset for it, left-aligned, with consistent height (roughly 24–32px). When no logo asset exists, fall back to the provider name as styled text (the same `providerLabel()` output) so the section still reads clearly. The `ProviderLogo` dispatcher owns this fallback.
- Logos must respect dark/light theme — light variant on dark, dark variant on light. The legacy `frontend/src/assets/openai/` already has both; the new repo also has `frontend-nextjs/assets/anthropic/Anthropic_Logo.svg`. Follow the same pattern (light + dark variants under `components/svg/` named per provider) as more assets land.

### Cards

- Each model is a **card**, not a list row. Cards arranged in a responsive grid (1 column on narrow widths, 2 columns at modal max width).
- Card content (top → bottom):
  - Display name (prominent).
  - Short description if present (truncate at ~2 lines).
  - Optional metadata row — context window if `maxInputTokens` is present.
- Selected card has a clear visual distinction (border + subtle background tint + check icon corner).
- Whole card is the click target; uses `<button>` semantics.

### Interaction

- Click a card → selects the model and closes the modal (unchanged behavior).
- Keyboard: arrow keys move between cards within and across sections; Enter selects; Escape closes.
- Modal width grows to comfortably fit a 2-column grid (roughly `max-w-2xl` instead of `max-w-md`).

### States

- **Loading** — skeleton cards (3–4 shimmer placeholders), no provider sections.
- **Error** — centered message + a retry button that re-fires the fetch.
- **Empty** — centered message ("No models available"); shouldn't happen in practice but render gracefully.

## Component breakdown

Keep each piece small and PascalCase per the file-naming rule.

- `components/chat/ModelSelectionModal.tsx` — already exists; refactor to render sections + grid + state branches.
- `components/chat/ProviderSection.tsx` — header (logo) + grid of cards for one provider.
- `components/chat/ModelCard.tsx` — single model card. Pure controlled (`model`, `selected`, `onSelect`).
- `components/chat/ProviderLogo.tsx` — switches on `ProviderId` and renders the right logo from `components/svg/`, or falls back to the provider name as styled text when no asset exists. Single dispatcher so consumers don't branch on provider.
- `components/svg/AnthropicLogo.tsx`, `OpenAILogo.tsx`, etc. — one file per provider mark, per the SVGs-in-their-own-files rule. Light/dark handled with `currentColor` where the SVG allows, otherwise via a theme-aware variant inside `ProviderLogo`.
- `types/model.ts` — `Model` and `ProviderId` types (no runtime values).
- `lib/models.ts` — runtime helpers only: `providerLabel()` and similar. Type definitions live in `types/model.ts`.
- `lib/catalog.ts` (new) — axios fetch + the module-level cache and hook (`useModelCatalog()` returning `{ status, models, error, refetch }`). Fetches once per page load; subsequent consumers read from the cache.

## Accessibility

- Section header logo has an `aria-label` with the provider name (logos themselves are decorative SVGs).
- Each card is a real `<button type="button">` with an accessible name = the model display name.
- `aria-current="true"` on the selected card.
- Keyboard navigation across the grid uses a roving tabindex (only one card is in the tab order at a time).

## Styling

- Tailwind utilities, semantic tokens (`bg-surface`, `border-subtle`, etc.) for theme support.
- Cards: rounded, 1px border, hover lifts the border color, selected adds a stronger ring.
- Grid: CSS grid with `grid-cols-1 sm:grid-cols-2`.

## Out of scope

- Per-model pricing, latency, or capability badges (could come later — the card layout should leave room for them).
- Filtering / search within the modal.
- Favoriting or pinning models.
- Showing non-chat model types — the endpoint already filters to chat-only.
- Backend changes — this spec consumes the existing `/catalog/chat-only` as-is.
- Streaming, message sending, anything past selection.

## Resolved decisions

- **Missing provider logos:** fall back to the provider's name as styled text (via `providerLabel()`). No need to block on sourcing assets — `ProviderLogo` handles the dispatch transparently.
- **Provider section order:** unspecified for now. Render in the order the backend returns them; revisit if the layout feels arbitrary.
- **Cache lifetime:** fetch once per page load. No background refresh, no TTL. Revisit if the catalog starts changing more often than that.
