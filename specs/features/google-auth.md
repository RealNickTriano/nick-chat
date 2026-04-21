# Google OAuth

Sign the user in with their Google account. This is the first authenticated surface in the app and lays the groundwork for persistent chat history (a separate spec) by giving every request a stable user identity.

The `send-message` spec flagged backend auth as out of scope under a "single-user dev assumption". This spec fills that gap: it introduces sessions, a `/auth/*` surface on the backend, and the minimal UI needed to sign in, see who you are, and sign out. It does **not** introduce chat persistence, multi-provider identity linking, or an admin surface — see "Out of scope".

## Goal

Let a user click "Sign in with Google", complete Google's consent screen, and come back to the app signed in. Every subsequent request to the backend is associated with a known user via a session cookie. Signing out clears that session cleanly.

Minimum viable auth: one identity provider, one session mechanism, one user record per Google account. No password fallback, no magic links, no email/password form.

## Shape

```
┌────────────┐  GET /auth/login/google    ┌───────────────┐
│  Frontend  │ ─────────────────────────▶ │   Backend     │
│  (sign in  │                            │ (Spring       │
│   button)  │ ◀──302 to accounts.google ─│  Security     │
└────────────┘                            │  OAuth2       │
                                          │  Client)      │
       │                                  └───────────────┘
       ▼                                         ▲
  accounts.google.com ── consent ── code ────────┘
       │
       ▼
  GET /auth/callback/google?code=...
       │                                  ┌───────────────┐
       ▼                                  │  Users store  │
   exchange code → id_token ─ upsert ───▶ │  (by Google   │
       │                                  │   sub)        │
       ▼                                  └───────────────┘
   Set-Cookie: SESSION=...; HttpOnly; Secure; SameSite=Lax
       │
       ▼
   302 redirect back to the frontend (`/`)
```

Everything OAuth-related happens on the backend. The frontend only ever sees "send me to the login URL" and "read who I am" — it never touches the Google endpoints or the `code` parameter directly.

## Backend contract

### Endpoints

All under `/auth`. CORS and cookie scope match the existing `/catalog` and `/chat` endpoints.

- `GET /auth/login/google` — begins the OAuth flow. Returns `302` to Google's authorization endpoint. Spring Security generates the `state` and (optionally) `nonce` and stores them server-side.
- `GET /auth/callback/google` — Spring Security's registered redirect URI. Exchanges the `code` for tokens, reads the `id_token`, upserts the user record, creates a session, sets the `SESSION` cookie, and `302`s back to the frontend origin (configurable, defaults to `http://localhost:3000`).
- `GET /auth/me` — returns the current user as JSON, or `401` if no valid session:
  ```json
  {
    "id": "usr_01HXYZ...",
    "googleSub": "118331...",
    "email": "user@example.com",
    "displayName": "Nick Triano",
    "pictureUrl": "https://lh3.googleusercontent.com/..."
  }
  ```
- `POST /auth/logout` — invalidates the session on the server, clears the `SESSION` cookie (Max-Age=0), returns `204`. POST (not GET) so it isn't triggered by link prefetching.

### Spring Security configuration

- Dependency: `spring-boot-starter-oauth2-client` (+ `spring-boot-starter-security`, pulled transitively). No Spring Session, no JWT library — the built-in `HttpSession` is sufficient for v1.
- `application.properties`:
  ```
  spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
  spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
  spring.security.oauth2.client.registration.google.scope=openid,email,profile
  spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/auth/callback/google
  app.auth.post-login-redirect=http://localhost:3000
  ```
  Google is the only registration. The `provider.google.*` URLs use the Spring defaults (issuer discovery at `https://accounts.google.com`).
- `SecurityFilterChain`:
  - `/auth/**`, `/catalog/**` — permit all.
  - `/chat/**` — requires authentication. Unauthenticated requests get `401` (not a redirect, so the SSE client doesn't try to parse HTML).
  - `/auth/login/google` is wired as the authorization-request endpoint; `/auth/callback/google` as the redirection endpoint.
  - Success handler: upsert user, set session attribute `userId`, 302 to `app.auth.post-login-redirect`.
  - Failure handler: 302 to `${post-login-redirect}/?auth_error=<short-code>`.
- CSRF: disabled for `/chat/**` (SSE, same as today) and `/auth/logout` (explicit opt-out via the logout endpoint's own CSRF token, see below).
- Session cookie: `HttpOnly`, `Secure` in production, `SameSite=Lax`. `Lax` is required so Google's cross-site `302` back to the callback still carries the session being established.

### User record

A minimal `User` aggregate keyed by Google's `sub` claim. For v1 store in memory (`ConcurrentHashMap<String googleSub, User>`) behind a `UserRepository` interface, so swapping in a JPA repo when the persistence spec lands is a one-file change.

```java
public record User(
    String id,          // internal id, ULID; generated on first login
    String googleSub,   // stable Google account id; the identity key
    String email,
    String displayName,
    String pictureUrl,
    Instant createdAt,
    Instant lastLoginAt
) {}
```

- On callback, upsert by `googleSub`: create if absent, otherwise update `email`/`displayName`/`pictureUrl`/`lastLoginAt`. Never use `email` as the key — Google users can change the email on their account.
- The session stores only the internal `id`. Everything else is read from the repo on `/auth/me`.

### CSRF for logout

Logout is a state-changing request, so it needs protection. Two straightforward options:

1. Enable Spring Security's CSRF token for `/auth/logout` and expose it via a `XSRF-TOKEN` cookie (default Spring behavior). Frontend reads the cookie, echoes it in `X-XSRF-TOKEN` on the POST.
2. Require the request to carry the `Origin` header matching the configured frontend origin (a cheap, standard defense for cookie-auth APIs).

Go with **(1)** — it's what Spring Security does out of the box, and it generalizes to future state-changing endpoints.

## Frontend behavior

### Sign-in surface

- A "Sign in with Google" button rendered in the app header when `/auth/me` returns `401`.
- On click, navigate the browser (full document navigation, not `fetch`) to `${NEXT_PUBLIC_API_BASE_URL}/auth/login/google`. Full navigation is required — the flow ends in Google redirecting back to the backend callback, which then redirects to the frontend origin.
- No loading spinner needed — the click is instantly a navigation.

### Signed-in surface

- The header shows an avatar (from `pictureUrl`) + display name. Clicking opens a small menu with a single "Sign out" action.
- Sign out calls `POST /auth/logout` with credentials included and the CSRF header, then triggers a re-fetch of `/auth/me` (which will now 401) so the UI flips back to the signed-out state without a full reload.

### `useAuth` hook

- `hooks/use-auth.ts` — owns the auth state: `{ status: "loading" | "authed" | "anon", user: User | null, signOut(): Promise<void>, refresh(): Promise<void> }`.
- On mount, calls `GET /auth/me` through the shared axios client with `withCredentials: true`.
- Caches the result at module scope so multiple consumers share one request (same pattern as `lib/catalog.ts`).

### Axios configuration

- Set `withCredentials: true` on the shared instance so the session cookie is sent on every call, including `/chat`.
- Add a response interceptor: on `401` from any call, flip the cached auth state to `anon`. Don't auto-redirect — the page re-renders the signed-out UI and the user decides what to do.

### Routing / gating

- The chat surface (the main `app/page.tsx`) is gated: when `status === "anon"`, render a centered `<SignedOutPlaceholder />` with the sign-in button and a short pitch. Do **not** render the composer or the conversation.
- `status === "loading"` renders a lightweight skeleton so unauth'd users don't briefly see the composer.
- No middleware-based redirects in v1 — all gating is rendered, since there's only one route.

### Component breakdown

PascalCase components, SVGs in their own files, one file per icon — per the frontend guidelines and the user's standing preferences.

- `components/auth/SignInButton.tsx` — the "Sign in with Google" button. Renders `<GoogleLogo />` + label, fires a full navigation on click.
- `components/auth/UserMenu.tsx` — avatar + dropdown with "Sign out". Pure controlled; consumes `useAuth`.
- `components/auth/SignedOutPlaceholder.tsx` — the centered empty state shown when unauthenticated.
- `components/auth/Avatar.tsx` — renders `<img>` for `pictureUrl` with a fallback initial when the URL is missing/broken.
- `components/svg/GoogleLogo.tsx` — Google's `G` mark, in its own file. Sets its own default className inside the component (per the per-logo-classNames rule); consumers can still override.
- `hooks/use-auth.ts` — the auth hook described above.
- `lib/auth.ts` — thin wrapper around the axios client: `fetchMe()`, `logout()`, `loginUrl()`. Runtime helpers only; no types.
- `types/user.ts` — the `User` type as returned by `/auth/me`.

### Header placement

The existing layout doesn't have a persistent header component yet. This spec introduces `components/layout/Header.tsx` mounted in `app/layout.tsx`, rendering the app title on the left and either `<SignInButton />` or `<UserMenu />` on the right depending on auth status. That's the only layout change — the chat surface below is untouched structurally.

## Security

- **Cookies.** `HttpOnly` (no JS access), `Secure` in production, `SameSite=Lax`. Reject any attempt to set `SameSite=None` without `Secure`.
- **Redirect URI allowlist.** Google is registered with exactly one callback per environment. The post-login redirect target is read from config, not from a query parameter — never let the client choose where to land.
- **Scopes.** Request only `openid email profile`. No Drive, Gmail, Calendar scopes — adding them later is deliberate and visible.
- **Token handling.** The backend never exposes Google's access or refresh tokens to the frontend. It reads the `id_token` once, extracts identity claims, and discards the access token (we don't need Google APIs in v1).
- **Session lifetime.** 7 days sliding expiration. Idle past that → 401. Reauthenticate by signing in again.
- **Logout.** Invalidate server-side session (`HttpSession.invalidate()`) in addition to clearing the cookie. Don't rely on cookie deletion alone.
- **Email verification.** Only accept logins where Google's `email_verified` claim is `true`. Reject otherwise with a failure redirect and `?auth_error=email_unverified`.

## Errors

Auth failures surface on the frontend via the `auth_error` query parameter on the post-login redirect. The frontend reads it on mount, shows an inline error on the signed-out placeholder, and clears it from the URL via `history.replaceState`.

Error codes:

- `state_mismatch` — CSRF/state check failed. "Please try signing in again."
- `email_unverified` — Google reports the email as unverified. "Verify your email with Google, then try again."
- `provider_error` — Google returned an error (user denied consent, network issue). "Sign-in was cancelled or failed."
- `server_error` — anything else. Generic message; log the real cause server-side with a correlation id.

The `/auth/me` endpoint never leaks detail — it's just `200` with the user or `401` with an empty body.

## Accessibility

- Sign-in button is a real `<button>` (or `<a>` styled as a button, since it navigates) with an accessible name of "Sign in with Google".
- Google logo SVG is decorative (`aria-hidden="true"`). The accessible name comes from the button text.
- User menu is keyboard-navigable (arrow keys within the menu, Escape closes, focus returns to the trigger).
- Avatar image has `alt=""` when purely decorative next to the display name; otherwise `alt={displayName}`.
- The signed-out placeholder is announced once via `aria-live="polite"` on the route transition, not per render.

## Environment / setup

- Google Cloud Console: create an OAuth 2.0 Client ID (Web application). Authorized redirect URIs:
  - `http://localhost:8080/auth/callback/google` (dev)
  - Production URL when it exists.
- Environment variables required on the backend:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `APP_AUTH_POST_LOGIN_REDIRECT` (e.g. `http://localhost:3000`)
- Frontend env vars: none new. `NEXT_PUBLIC_API_BASE_URL` already points at the backend.
- Both secrets go in `application-local.properties` (gitignored) for dev; `.env` for CI; platform secret store in production. Never commit them.

## Testing

Backend:

- Unit: `UserRepository` upsert-by-`googleSub` creates on first login and updates mutable fields on subsequent logins without changing `id` or `createdAt`.
- Integration (MockMvc + Spring Security test support): `/chat` returns `401` without a session; returns the stream when the session is present.
- Integration: `/auth/me` returns `401` anonymously and the user payload when authenticated via `with(user(...))`.
- The Google exchange itself is not unit-tested — it's Spring's code. A manual smoke test covers the real round-trip.

Frontend:

- Vitest for `use-auth` loading → authed / anon transitions with a mocked axios client.
- Vitest for `SignedOutPlaceholder` rendering the error banner when `auth_error` is present.
- Manual: real Google login in dev, verifying the cookie is set, `/auth/me` returns the user, `/chat` streams, `/auth/logout` clears the state.

## Out of scope (for this spec)

- **Chat history persistence** — a separate spec will land when the user model is a fixture. This spec just makes sure every `/chat` request has a user id on it.
- **Additional identity providers** (GitHub, email/password, magic links). The user/session model is built so adding a second provider is additive, not a rewrite.
- **Account linking / merging** across providers.
- **Profile editing.** Display name and picture come from Google and update on every login — no in-app editing surface.
- **Admin / role-based access.** Every signed-in user has the same access.
- **Refresh tokens / long-lived Google sessions.** We only read the `id_token` once per login.
- **Rate limiting login attempts.** Google throttles on its side; revisit if abuse shows up.
- **Server-rendered auth state.** The header renders client-side based on `/auth/me`. Server-component auth-aware rendering is a follow-up once it matters for first paint.

## Resolved decisions

- **Auth lives on the backend, not in Next.js.** Spring Security OAuth2 client handles the code exchange; the frontend only navigates to `/auth/login/google` and reads `/auth/me`. Rationale: keeps Google's client secret out of the frontend deploy, and the backend is already the only thing that talks to providers — auth fits naturally next to it.
- **Session cookies, not JWTs.** `HttpOnly` session cookie with server-side state is simpler, revocable, and avoids the token-refresh dance. If we ever need stateless auth (e.g. for a non-browser client), revisit.
- **Google `sub` is the identity key.** `email` is not stable enough (Google users can change the primary email on their account).
- **One Google account → one user record.** No account linking in v1.
- **Gated at render time, not middleware.** Only one authenticated route today. Middleware-based redirects can come back when there's a second route that needs them.
- **Scopes minimized to `openid email profile`.** Any additional scope is a deliberate, spec-worthy addition.
- **Logout is POST with CSRF.** GET logout is footgun-prone (link prefetching, image tags).
- **Upsert on every login.** Keeps `displayName` and `pictureUrl` in sync with Google without an explicit "sync profile" button.
