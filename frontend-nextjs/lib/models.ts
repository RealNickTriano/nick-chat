import type { ProviderId } from "@/types/model";

const PROVIDER_LABELS: Record<string, string> = {
  OPEN_AI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google",
  MISTRAL: "Mistral",
};

export function providerLabel(provider: ProviderId): string {
  return PROVIDER_LABELS[provider] ?? provider;
}
