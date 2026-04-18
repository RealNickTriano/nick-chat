# Frontend Guidelines

Guidelines for the `frontend-nextjs/` app. The stack is Next.js 16, React 19, TypeScript, Tailwind CSS v4, and axios for HTTP.

> **Note on Next.js 16.** APIs and conventions in Next.js 16 differ from older versions. Before writing code that touches routing, data fetching, caching, metadata, or server/client boundaries, consult `node_modules/next/dist/docs/` rather than relying on memory.

## Directory layout

- `app/` — routes, layouts, and route-local UI. Colocate route-specific components, loading/error states, and server actions inside the route directory.
- `components/` — reusable UI primitives and composite components shared across routes. Split into `components/ui/` (unstyled primitives, design-system atoms) and `components/chat/`, `components/sidebar/`, etc. (feature clusters).
- `lib/` — non-UI code: API clients, provider adapters, storage helpers, utilities. **No type-only files here** — those live in `types/`.
- `types/` — all shared TypeScript types and interfaces. One file per domain (`model.ts`, `chat.ts`, `provider.ts`). Types only — no runtime values, no functions. If a type is only consumed by a single component or function, define it inline at the call site instead of adding it here.
- `hooks/` — reusable React hooks. One hook per file, named `use-*.ts`.
- `styles/` — global CSS, Tailwind layer extensions. Keep this directory thin; prefer Tailwind utilities in components.
- `public/` — static assets only.

Do not create `utils.ts` dumping grounds. If a helper has no clear home, it probably belongs closer to its caller.

## Server vs. client components

- **Default to server components.** Only mark a file `"use client"` when it actually needs client-side state, effects, event handlers, or browser APIs.
- Keep the client boundary as low in the tree as possible. A chat message bubble can be a server component even if the composer below it is client.
- Never import server-only code (API keys, DB clients, provider SDKs with secrets) into a client component. Use server actions or route handlers as the boundary.

## Data flow

- **Streaming first.** LLM responses stream token-by-token. Use React's streaming primitives and the `ReadableStream` / `Response` body directly — don't buffer whole responses before rendering.
- **Server actions** for mutations that originate from a form or button and don't need streaming.
- **Route handlers** (`app/api/*/route.ts`) for streaming endpoints and anything called from a client hook.
- **HTTP via axios.** All outbound HTTP calls go through a single configured axios instance (e.g. `lib/http.ts`) with base URL, timeouts, and interceptors for auth and error normalization. Don't use `fetch` directly in feature code — exceptions are server-side streaming where you need the raw `Response` body.
- **One client per concern.** Provider adapters (Anthropic, OpenAI, etc.) each build on the shared axios instance; don't reinvent retry/error handling in each adapter.
- **Types at the boundary.** Response shapes are validated/typed at the axios layer so feature code never handles raw `unknown` payloads.

## State management

- **Local first.** Component state covers the majority of cases.
- **URL state** for anything a user might want to share or bookmark — active chat ID, selected model, etc. Prefer route params or search params over client-only state for these.
- **Persisted state** (chat history, theme, last-used model) lives in the durable store (see persistence guidelines). Do not duplicate persisted state in a global context.
- **Global context is a last resort.** If two distant components need the same state, check first whether lifting to a shared layout or reading from the URL solves it.

## Styling

- **Tailwind v4 utilities** are the default styling mechanism. Use `@theme` in `globals.css` to define design tokens; don't hardcode colors or spacing in components.
- **No CSS-in-JS libraries.** Tailwind covers the need and avoids runtime cost.
- **Design tokens, not raw values.** Reference semantic tokens (`bg-surface`, `text-muted`) rather than palette values (`bg-zinc-900`). This keeps dark/light theming trivial.
- **Theming via `data-theme` or `class` on `<html>`.** Respect `prefers-color-scheme` by default; allow manual override persisted to local storage. Avoid flashes of unstyled theme by setting the initial class in a blocking inline script in `layout.tsx`.

## Icons and SVGs

- **Every custom SVG lives in its own file under `components/svg/`.** Never inline `<svg>` markup in a feature component. Naming is by shape/concept (`ArrowRight.tsx`, `ChevronDown.tsx`, `Check.tsx`), not by where it's used (`SendButtonArrow.tsx` is wrong).
- Each icon is a stateless component that spreads `SVGProps<SVGSVGElement>` onto the root `<svg>` and defaults `aria-hidden="true"`. Consumers override size/color via `className` or props.
- This keeps icon styling locatable, re-use trivial, and feature components free of visual clutter.

## File naming

- **Component files are PascalCase** and match the exported component name: `Composer.tsx`, `ModelSelector.tsx`, `ArrowRight.tsx`. One component per file (plus closely-related sub-types).
- **Non-component TS files are kebab-case**: `models.ts`, `use-chat-stream.ts`, `http-client.ts`.
- **Route files follow Next.js conventions** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`) — these are lowercase by framework requirement, not by our convention.

## Components

- **Small and composable.** A component should do one thing. If a file exceeds ~200 lines, it's probably two components.
- **Props are explicit.** No `...rest` spreading onto DOM elements unless the component is a true passthrough primitive. Typed props, no `any`.
- **Server components can't accept functions as props from clients.** Plan boundaries accordingly.
- **No barrel files** (`index.ts` re-export hubs). They hurt tree-shaking and make imports harder to trace. Import from the actual file.

## Accessibility

- Semantic HTML first. `<button>` for actions, `<a>` for navigation. Never `<div onClick>`.
- Every interactive element is keyboard-reachable and has a visible focus state.
- The chat stream is announced to assistive tech: use `aria-live="polite"` on the message list region.
- Color contrast meets WCAG AA in both themes. Verify tokens, not individual components.

## Performance

- **Avoid unnecessary client JS.** Every `"use client"` ships bytes; justify them.
- **Stream and suspend.** Use `<Suspense>` boundaries around slow regions so the shell renders immediately.
- **Virtualize long message lists** once a chat exceeds a few hundred messages. Don't virtualize prematurely.
- **Images via `next/image`.** Static assets through `public/`.
- **No large client libraries without measuring.** Before adding a dep, check its bundle impact.

## TypeScript

- `strict: true` stays on. No `// @ts-ignore`; use `// @ts-expect-error` with a reason when genuinely needed.
- Model provider responses with discriminated unions, not optional fields. The compiler should make invalid states unrepresentable.
- Exported functions have explicit return types. Internal helpers can infer.

## Errors and loading

- Every route has a `loading.tsx` and `error.tsx`. Don't let users stare at blank screens.
- Errors in streaming responses surface inline in the message stream, not as toasts — users need to see which turn failed.
- Network failures offer retry, not just a dead state.

## Testing

- **Vitest** is the test runner. Tests live next to the code they cover (`foo.ts` + `foo.test.ts`) or in `__tests__/` when grouping makes sense.
- Run `npm test` for a one-shot run; `npm run test:watch` during development.
- Components with non-trivial logic get unit tests. Pure rendering doesn't need a test.
- Test the behavior users care about (typing, sending, switching models), not implementation details (which hook fired).
- Provider adapters are tested against recorded fixtures, not live APIs.

## Tooling and pre-commit

- **Formatting: Prettier.** Config lives in `.prettierrc`. Run `npm run format` to write, `npm run format:check` to verify.
- **Linting: ESLint** via `eslint-config-next`. Run `npm run lint`.
- **Tests: Vitest.** Run `npm test`.
- **Pre-commit enforcement.** A git hook at `.githooks/pre-commit` (repo root) runs `format:check`, `lint`, and `test` against `frontend-nextjs/` whenever files in that workspace are staged. Enable it with `git config core.hooksPath .githooks` after cloning. Do not bypass with `--no-verify` — fix the underlying issue.

## What not to do

- Don't reach for a state library, form library, or component library before the hand-rolled version hurts. The app's surface is small enough to own directly.
- Don't build abstraction layers for a single consumer. Wait for the second use case.
- Don't mix server-only and client-only code in the same module. Split them.
- Don't reintroduce patterns from older Next.js versions (`pages/`, `getServerSideProps`, `_app.tsx`, etc.) — this is Next.js 16.
