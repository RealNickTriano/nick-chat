import type { ProviderId } from "@/types/model";

const PROVIDER_LABELS: Record<string, string> = {
  OPEN_AI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE_AI_GEMINI: "Google Gemini",
  MISTRAL_AI: "Mistral AI",
};

const API_KEY_URLS: Record<string, string> = {
  OPEN_AI: "https://platform.openai.com/api-keys",
  ANTHROPIC: "https://platform.claude.com/settings/keys",
  GOOGLE_AI_GEMINI: "https://aistudio.google.com/apikey",
  MISTRAL_AI: "https://console.mistral.ai/api-keys",
};

export function providerLabel(provider: ProviderId): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function providerApiKeyUrl(provider: ProviderId): string {
  return API_KEY_URLS[provider] ?? "";
}
