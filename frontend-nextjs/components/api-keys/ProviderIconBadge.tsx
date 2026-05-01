import { OpenAIIconLogo } from "../svg/OpenAIIconLogo";
import { ProviderId } from "@/types/model";
import { providerLabel } from "@/lib/models";
import { AnthropicIconLogo } from "../svg/AnthropicIconLogo";
import { GoogleIconLogo } from "../svg/GoogleIconLogo";
import { MistralIconLogo } from "../svg/MistralIconLogo";

interface ProviderIconBadgeProps {
  provider: ProviderId;
  size?: "sm" | "md";
}

export function ProviderIconBadge({ provider, size = "md" }: ProviderIconBadgeProps) {
  const container =
    size === "sm"
      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg2)]"
      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)]";

  return (
    <div className={container}>
      {(() => {
        switch (provider) {
          case "OPEN_AI":
            return <OpenAIIconLogo className={size === "sm" ? "size-6" : undefined} />;
          case "ANTHROPIC":
            return <AnthropicIconLogo className={size === "sm" ? "size-3" : undefined} />;
          case "GOOGLE_AI_GEMINI":
            return <GoogleIconLogo className={size === "sm" ? "size-3.5" : "size-6"} />;
          case "MISTRAL_AI":
            return <MistralIconLogo className={size === "sm" ? "size-3.5" : "p-0.5"} />;
          default:
            return providerLabel(provider).charAt(0);
        }
      })()}
    </div>
  );
}
