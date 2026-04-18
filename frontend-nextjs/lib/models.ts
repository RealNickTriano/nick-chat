export type ProviderId = "anthropic" | "openai" | "google" | "xai";

export type ModelId = string;

export interface Model {
  id: ModelId;
  label: string;
  provider: ProviderId;
  providerLabel: string;
}

// Placeholder list — the real catalog will be fetched from an API.
// Keep this small and stable; it's only here so the UI has something to render
// during development.
export const MODELS: Model[] = [
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "anthropic",
    providerLabel: "Anthropic",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    providerLabel: "Anthropic",
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "openai",
    providerLabel: "OpenAI",
  },
];

export const DEFAULT_MODEL_ID: ModelId = "claude-opus-4-7";
