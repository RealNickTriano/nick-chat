# API Key Management — Remaining Work

## Current State

The backend CRUD skeleton exists: `ApiKeyController`, `ApiKeyService`, `ApiKeyEntity`, `ApiKeyRepository`, `ApiKeyResponse`, and the AES-GCM `CryptoService` are all in place. The `api_keys` DB migration is applied. However, several correctness gaps remain, and the frontend has no API key management UI at all.

---

## Backend Gaps

### 1. Provider validation

`ApiKeyService.upsert()` and `.delete()` accept raw strings with no validation. Any string is accepted as a provider.

Changes required:
- Validate the provider string against the known-provider enum (`ModelProvider` or a local `Provider` enum).
- Return `400` with message `"Unknown provider: <value>"` for unknown values.
- Apply this check in both `upsert()` and `delete()`.

### 2. Request validation missing

`UpsertApiKeyRequest` has no validation annotations and the controller does not use `@Valid`.

Changes required:
- Add `@NotBlank` and `@Size(max = 500)` to the `key` field in `UpsertApiKeyRequest`.
- Add `@Valid` to the `@RequestBody` parameter in `ApiKeyController.upsert()`.

### 3. `GET /api-keys` response shape

The spec defines the response as `{ "apiKeys": [...] }`. The current implementation returns a bare `List<ApiKeyResponse>`.

Changes required:
- Wrap the list in a record or map: `{ "apiKeys": [...] }`.

---

## Frontend Gaps

The Next.js frontend (`frontend-nextjs/`) has partial scaffolding for this feature: a broken `ApiKeysModal`, a `useApiKeys` hook missing delete + auto-fetch, a non-clickable `UserBanner`, and a debug block in `LeftSidebar`. The work below replaces or extends what's there — it does not start from zero.

### 4. Pre-work — reconcile provider IDs with the backend

`frontend-nextjs/types/model.ts` defines `ProviderId` as `"OPEN_AI" | "ANTHROPIC" | "GOOGLE" | "MISTRAL"`. The backend's `ApiKeyService.SUPPORTED_PROVIDERS` is `ANTHROPIC, OPEN_AI, GOOGLE_AI_GEMINI, MISTRAL_AI`. Anything sent as `GOOGLE` or `MISTRAL` will 400.

Required:
- Update `ProviderId` to `"OPEN_AI" | "ANTHROPIC" | "GOOGLE_AI_GEMINI" | "MISTRAL_AI"`.
- Update the `KNOWN_PROVIDERS` array in `lib/api-keys.ts` to match.
- Add `providerLabel` entries for `GOOGLE_AI_GEMINI` ("Google") and `MISTRAL_AI` ("Mistral") in `lib/models.ts`.
- Add `providerApiKeyUrl` entries for the new IDs in `lib/models.ts` (Google AI Studio, Mistral La Plateforme).
- Update `ProviderLogo`'s switch in `components/chat/ProviderLogo.tsx` so the `default` branch still renders sensibly for `GOOGLE_AI_GEMINI` and `MISTRAL_AI` until logos exist.

### 5. Hook: extend `useApiKeys`

File: `frontend-nextjs/lib/api-keys.ts`. The existing hook has `keys`, `refreshKeys`, `saveKeyForProvider`. It does **not** auto-fetch and has no delete.

Required:
- Add `deleteKeyForProvider(provider: ProviderId): Promise<void>` that calls `DELETE /api-keys/{provider}` via `http`. On success, clear that provider's `keyMask`, `createdAt`, `updatedAt` in local state (preserve the row, just empty the saved fields).
- Auto-fetch on mount with a `useEffect` that calls `refreshKeys()` once. Track `loaded: boolean` in hook state so consumers can render skeletons.
- Per-row mutation tracking: `pending: Record<ProviderId, "saving" | "deleting" | undefined>` so the modal can disable individual rows during in-flight requests without blocking the others.
- Per-row error tracking: `errors: Record<ProviderId, string | undefined>`. Set on caught failures; cleared on next successful mutation for that provider. Don't `console.error` and swallow — the row needs to display the message.
- The hook returns `{ keys, loaded, pending, errors, refreshKeys, saveKeyForProvider, deleteKeyForProvider }`.
- Treat `keys` as a stable list keyed by provider — never reorder. The four provider rows always render in the order defined in `KNOWN_PROVIDERS`.

### 6. Trigger: make `UserBanner` open the modal

File: `frontend-nextjs/components/layout/UserBanner.tsx`. Currently a non-interactive `<div>` at the bottom of `LeftSidebar`.

Required:
- Convert the outer container to a `<button type="button">`. Keep the existing layout (avatar + name + email).
- Add a hover affordance — background `var(--bg3)` on hover; transition `background-color 120ms ease`.
- Take an `onClick` prop typed `() => void` and wire it to the button.
- Keep the focus-visible ring style consistent with other sidebar buttons (use the existing pattern from `NewChatButton` if present).
- Remove the commented-out Settings icon block — it isn't part of this feature.

In `LeftSidebar.tsx`:
- Remove the debug `<pre>{JSON.stringify(keys)}</pre>` and "Refresh keys" button.
- Remove the unconditional `<ApiKeysModal />` mount.
- Add local `const [keysOpen, setKeysOpen] = useState(false)`.
- Render `<ApiKeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />` and pass `onClick={() => setKeysOpen(true)}` to `UserBanner`.

### 7. Component: `ApiKeysModal` (rewrite)

File: `frontend-nextjs/components/api-keys/ApiKeysModal.tsx`. **Delete the existing implementation** — it uses `localStorage`, references an undefined `setKeys`, and has untyped props. Rewrite from scratch.

#### 7.1 Props

```ts
interface ApiKeysModalProps {
  open: boolean;
  onClose: () => void;
}
```

Use a named export, not default. Update the import in `LeftSidebar.tsx` accordingly.

#### 7.2 Behavior

- When `open` is `false`, render `null`. No portals required — top-level fixed div is fine.
- Backdrop: `fixed inset-0 z-50` with semi-transparent black + backdrop blur. Clicking the backdrop (but not the dialog) calls `onClose`.
- ESC key while open calls `onClose`. Use a single `useEffect` with `keydown` listener gated on `open`.
- Body scroll lock while open: set `document.body.style.overflow = "hidden"` and restore on close/unmount.
- On open, focus the first interactive element inside the dialog (close button is fine).
- The dialog has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the header title `<h2>` id.

#### 7.3 Layout & theming

- Centered card, `width: 520px`, `max-height: 85vh`, internal scroll if content overflows.
- Theme tokens **only** — no raw `bg-zinc-900` / `dark:bg-zinc-800`. Use `var(--bg)` for the card surface, `var(--bg2)` for input fields, `var(--border)` for dividers, `var(--text)` / `var(--text2)` / `var(--text3)` for the three text levels, `var(--accent)` for the primary action button.
- Font: inherits `var(--font-sans)`. Masked keys and the input use `var(--font-mono)`.
- Rounded corners `rounded-2xl`. Border `1px solid var(--border)`. Subtle shadow.
- Three regions:
  - **Header** (~56px): `<h2>` "API Keys" + one-line subtitle "Bring your own key for each provider" + close button (use `CloseIcon` from `components/svg/Close.tsx`).
  - **Body**: stack of four `<ApiKeyRow>` instances, separated by 1px `var(--border)` dividers (no divider after the last row).
  - **Footer** (~48px): muted helper text "Keys are encrypted at rest" with a small lock glyph (inline SVG is fine here since it's a one-off — but if the same lock appears elsewhere later, promote it to `components/svg/Lock.tsx` per the SVG-files convention).

#### 7.4 Empty state

If `loaded === false`, render four skeleton rows (gray pulse blocks at row height) so the modal doesn't visibly reflow when keys arrive. After load, if a provider has no `keyMask` it goes into the "no key" branch of `ApiKeyRow` (see §8.3) — there is no separate empty state for the modal as a whole.

### 8. Component: `ApiKeyRow` (new)

New file: `frontend-nextjs/components/api-keys/ApiKeyRow.tsx`. One row per provider, containing all the per-row state. The modal does not lift this state.

#### 8.1 Props

```ts
interface ApiKeyRowProps {
  apiKey: ApiKey;            // the merged shape from useApiKeys
  pending: "saving" | "deleting" | undefined;
  error: string | undefined;
  onSave: (rawKey: string) => Promise<void>;
  onDelete: () => Promise<void>;
}
```

#### 8.2 Internal state machine

```
idle  ──[click Replace/Add]──▶  editing
idle  ──[click Remove]──────▶  confirming-delete
editing             ──[click Cancel / ESC]──▶  idle
editing             ──[click Save success]──▶  idle
confirming-delete   ──[click Cancel / ESC]──▶  idle
confirming-delete   ──[click Remove success]▶  idle
```

Use a single `useState<"idle" | "editing" | "confirming-delete">("idle")`.

When transitioning into `editing`, clear the input value to empty (do not pre-fill the mask). Auto-focus the input on entering `editing`.

#### 8.3 Visual states

All four states share a common left side: the provider logo (use `<ProviderLogo />` from `components/chat/`) wrapped in `<ProviderIconBadge>` and the provider label below or beside the logo per existing visual rhythm.

Right side varies:

**No key, idle** (`!apiKey.keyMask` && state === "idle"):
- Muted `var(--text3)` text "No key saved"
- Trailing `[Add key]` button (subtle outline button in `var(--accent)`)
- "Get key" external link via existing `<ApiKeyDocsLink />` somewhere on the row

**Has key, idle** (`apiKey.keyMask` && state === "idle"):
- Masked key in monospace — render `apiKey.keyMask` directly (it's already `sk-a...mnop` from the backend)
- Relative timestamp "Updated <time>" using `apiKey.updatedAt`. Acceptable formats: "today", "yesterday", "3 days ago", or fall back to `toLocaleDateString()` after 7 days. Implement once in `lib/relative-time.ts` (new) so other parts of the app can reuse it.
- Trailing `[Replace]` button + `[Remove]` icon button (TrashIcon from `components/svg/Trash.tsx`)

**Editing** (state === "editing"):
- Replace the right side with a row containing:
  - `<input type="password" autoComplete="off" spellCheck={false}>` filling available width, monospace font, `var(--bg2)` background
  - Trailing `[Cancel]` and `[Save]` buttons. Save is the accent primary button. Cancel is text-only.
- Submitting:
  - Trim the input. If empty, show inline error "Key cannot be empty" without calling the API.
  - If length > 500, show "Key too long (max 500)" without calling the API.
  - Otherwise call `onSave(value)`. While `pending === "saving"`, disable the input and both buttons; show a small spinner inside the Save button.
  - On success the parent will clear the input + mask change will re-render; transition back to `idle`.
  - On failure stay in `editing` and surface `error` underneath the input.

**Confirming delete** (state === "confirming-delete"):
- Replace the right side with a single muted-red strip containing text "Remove this key?" and trailing `[Cancel]` / `[Remove]` buttons. Remove is the destructive action — red text, no background.
- While `pending === "deleting"`, disable both buttons and show spinner on Remove.

#### 8.4 Errors

- The `error` prop is the source of truth for displayed errors. Render below the action area, small, red. Clear it by hand only when transitioning out of `idle` (so a stale error doesn't follow the user into `editing` after they've started over).

#### 8.5 Per-logo classNames (from feedback)

When the row hands a `className` to `<ProviderLogo>`, do **not** share one classname across providers. Each branch in `ProviderLogo`'s switch already sets its own default — pass `className` only when this row's specific layout needs to override.

### 9. Out of scope (this iteration)

- Chat-flow gate: prompting the user to add a key when they try to send a message without one. Deferred until the chat composer is wired; track separately.
- Key rotation, expiry, or audit log UI.
- Bulk import / export of keys.

---

## Suggested Implementation Order

| # | Task | Why |
|---|------|-----|
| 1 | Provider validation (backend) | Required for correct 400 behavior frontend relies on |
| 2 | Add `@Valid` + validation annotations (backend) | Input safety |
| 3 | Wrap `GET /api-keys` response (backend) | Match spec shape before frontend consumes it |
| 4 | Reconcile provider IDs (frontend §4) | Google/Mistral are broken until this lands; everything else builds on it |
| 5 | Extend `useApiKeys` hook (§5) | Modal needs delete + auto-fetch + per-row state |
| 6 | Make `UserBanner` clickable + clean `LeftSidebar` (§6) | Trigger surface for the modal |
| 7 | Rewrite `ApiKeysModal` shell (§7) | Hosts the rows |
| 8 | Build `ApiKeyRow` (§8) | The actual per-provider UX |
