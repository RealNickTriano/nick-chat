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

### 4. API key management UI

The frontend has no screen for managing API keys. Users cannot add, view, or delete keys through the UI.

Required functionality:
- A dedicated view (page or modal/drawer) listing all four providers: Anthropic, OpenAI, Google, Mistral.
- For each provider, show whether a key is saved (display the masked key if so, e.g. `sk-a...1234`) and the last updated timestamp.
- An input + save button per provider to add or replace a key.
- A delete button per provider to remove a saved key (with a confirmation step).
- A prompt or gate in the chat flow when the user attempts to send a message but has no key saved for the selected provider — direct them to the key management view.

API calls needed (all require CSRF header `X-XSRF-TOKEN`):
- `GET /api-keys` — fetch current keys on load.
- `PUT /api-keys/{provider}` — save or update a key.
- `DELETE /api-keys/{provider}` — remove a key.

---

## Suggested Implementation Order

| # | Task | Why |
|---|------|-----|
| 1 | Provider validation | Required for correct 400 behavior frontend relies on |
| 2 | Add `@Valid` + validation annotations | Input safety |
| 3 | Wrap `GET /api-keys` response | Match spec shape before frontend consumes it |
| 4 | Frontend API key management UI | Depends on backend items being correct |
