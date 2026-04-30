# Improved Model Selection

## Functional Requirements

- Users should be able to view a modal that shows all available models
  - this modal should have available providers listed on the left
  - when a provider is selected it shows the models for that provider, with a search bar to filter results
- Users should be able to favorite models and then they will appear on the dropdown menu that is inside the chat composer
- Users should be able to access this dropdown modal to quickly select a favorite model or recently used one
- Users can get to the all-model modal from a button on this dropdown menu

---

## Current State

- `ModelSelectorButton` — button in the composer toolbar; clicking it opens `ModelSelectionModal` directly.
- `ModelSelectionModal` — `<dialog>` listing all providers as collapsible sections with model cards. No search, no favorites.
- `ProviderSection` — collapsible per-provider section containing `ModelCard`s.
- `ModelCard` — shows model name and description. No favorite toggle.
- `ModelSelector` — orchestrates button + modal; persists selected model to `localStorage`.

---

## What Changes

### 1. New interaction flow

```
ModelSelectorButton (click)
  → ModelDropdown (popover)
      → pick a favorite or recent model  → close
      → "Browse all models" button
            → ModelSelectionModal (full modal)
                → pick a model → close both
```

`ModelSelectorButton` no longer opens the modal directly. It opens `ModelDropdown`.

---

### 2. State & persistence (`lib/`)

**`lib/favorites.ts`** (new)

```ts
const FAVORITES_KEY = "nick-chat:favorite-models";

export function useFavorites(): {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}
```

Persists a `string[]` of model IDs in `localStorage`. `toggleFavorite` adds if absent, removes if present.

**`lib/recent-models.ts`** (new)

```ts
const RECENT_KEY = "nick-chat:recent-models";
const MAX_RECENT = 5;

export function useRecentModels(): {
  recent: string[];          // model IDs, most-recent-first, max 5, distinct
  pushRecent: (id: string) => void;
}
```

Persists a `string[]` in `localStorage`. `pushRecent` prepends the ID (deduplicating) and trims to `MAX_RECENT`.

**SSR safety.** Both hooks must guard `localStorage` access with `typeof window !== "undefined"`. Initialize state to `[]` on first render, then hydrate from `localStorage` inside a `useEffect`. This matches the pattern already used in `ModelSelector` and avoids hydration mismatches.

**Stale entries.** Both `favorites` and `recent` are persisted by ID and outlive the catalog. Consumers must filter the returned ID list against the live catalog before rendering — a model that no longer exists silently drops from the list (do not throw, do not render a broken row). The persisted store itself is not pruned; if the model returns to the catalog later, it reappears.

---

### 3. `ModelSelector` (modified)

Add a second piece of open state: `dropdownOpen` (boolean).

- `ModelSelectorButton` click → `dropdownOpen = true`
- Picking from the dropdown → calls `onChange`, calls `pushRecent`, closes dropdown
- "Browse all" in dropdown → `dropdownOpen = false`, `modalOpen = true`
- Picking from the modal → calls `onChange`, calls `pushRecent`, closes modal

```tsx
const [dropdownOpen, setDropdownOpen] = useState(false);
const [modalOpen, setModalOpen] = useState(false);
```

---

### 4. `ModelDropdown` (new component)

A popover anchored **above** `ModelSelectorButton` — the composer sits at the bottom of the viewport, so a downward-opening dropdown would render off-screen. Position the popover with `bottom: 100%` relative to its anchor (or compute from the anchor's `getBoundingClientRect()`).

**Props:**
```ts
interface ModelDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement>;
  value: string | null;
  onPick: (id: string) => void;
  onBrowseAll: () => void;
}
```

**Sections (in order):**
1. **Favorites** — shown only if `favorites.length > 0`. Lists each favorited model as a row (provider dot + displayName). Clicking picks the model.
2. **Recent** — shown only if `recent.length > 0` (and excludes models already shown in Favorites). Lists each recently used model as a row.
3. If both sections are empty, show a single "No favorites yet" hint row.
4. **Footer** — always present: "Browse all models →" button that calls `onBrowseAll`.

Dismiss on Escape or click outside (use a `useClickOutside` hook or equivalent).

---

### 5. `ModelSelectionModal` (redesigned)

Two-panel layout replacing the current single scrollable list. The search bar spans the top of the modal so it is unmistakably **global** — it filters across all providers, not just the active one.

```
┌─────────────────────────────────────────────┐
│ Select a model                          [✕]  │
├─────────────────────────────────────────────┤
│ [Search models...]                           │
├──────────────┬──────────────────────────────┤
│ Providers    │                               │
│              │  ModelCard  ModelCard  ...    │
│ ● OpenAI (4) │  ModelCard  ModelCard  ...    │
│   Anthropic  │                               │
│   Google     │                               │
│   Mistral    │                               │
└──────────────┴──────────────────────────────┘
```

**Search bar (top, global):**
- Filters models across all providers by `displayName` and `id` (case-insensitive substring match on either).
- When the search box is non-empty, the left rail is *informational only*: every provider with at least one matching model is listed (with a count of matches in parens), and the right panel shows all matches across all providers, grouped by provider with simple headers.
- Clicking a provider in the left rail while a search is active scrolls the right panel to that provider's group.
- Clearing the search restores the per-provider view.

**Left panel — provider list:**
- One row per provider that has models in the catalog.
- Clicking a provider sets it as `activeProvider` (local state).
- Default `activeProvider` is the provider of the currently selected model, or the first provider.
- Active provider row is visually highlighted.

**Right panel — model grid:**
- When no search: shows `activeProvider`'s models as a grid of `ModelCard`s.
- When search is non-empty: shows all matching models across all providers, grouped by provider with a small header per group.
- If search yields no results, show "No models match your search."

**`ModelCard` changes:**
- Add a favorite toggle button (star icon, top-right corner).
- `isFavorite` and `onToggleFavorite` are passed as props.
- Star is filled when favorited.

`ModelSelectionModal` receives `favorites`/`toggleFavorite` from `useFavorites()` and passes them down to `ModelCard`.

---

## Component Summary

### Files to create
- `components/chat/ModelDropdown.tsx`
- `lib/favorites.ts`
- `lib/recent-models.ts`

### Files to modify
- `components/chat/ModelSelector.tsx` — add dropdown state, wire `ModelDropdown`, call `pushRecent` on pick
- `components/chat/ModelSelectionModal.tsx` — two-panel layout with provider sidebar, global search, favorite toggles
- `components/chat/ModelCard.tsx` — add `isFavorite` and `onToggleFavorite` props; render star button

### Files to delete
- `components/chat/ProviderSection.tsx` — collapsible-by-provider grouping is gone; the left rail is a flat list and the right panel renders model cards directly
- `lib/group-by-provider.ts` and `lib/group-by-provider.test.ts` — only used by the old `ModelSelectionModal`; the new design groups inline only when search is active

### Files unchanged
- `ModelSelectorButton.tsx` — no changes needed
- `Composer.tsx` — no changes needed
- `lib/catalog.ts` — no changes needed
