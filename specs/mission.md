# Mission

## What we're building

A fast, multi-provider LLM chat interface — inspired by T3 Chat. One app, many models, zero friction between picking a model and sending a message.

## Core experience

- **Instant chat**: pick a provider + model from a selector, start typing. No setup steps between selection and the first message.
- **Multi-provider**: support major LLM providers (e.g. Anthropic, OpenAI, Google, xAI, OpenRouter) behind a unified chat surface. Switching providers should feel like switching channels, not reconfiguring the app.
- **Chat history**: past conversations are persisted, browsable, and resumable. Users can return to any prior chat and continue where they left off.
- **Theming**: first-class dark and light modes. Respect system preference by default; allow manual override.

## Non-goals (for now)

- Agentic tool use, file uploads, image generation, or voice — not part of the initial mission. Keep the surface focused on text chat until the core is excellent.
- Team/collaboration features. Single-user experience first.

## Principles

- **Speed is a feature.** The gap between intent ("I want to ask Claude something") and action (message sent) should feel instantaneous.
- **Model choice is first-class.** The model selector is not buried in settings — it's part of the composing surface.
- **Conversations are durable.** Nothing a user types should be lost to a refresh, a provider swap, or a tab close.
- **The UI gets out of the way.** Chrome is minimal; the content is the message stream.
