import { OpenAIIconLogo } from "../svg/OpenAIIconLogo";
import { ProviderId } from "@/types/model";
import { providerLabel } from "@/lib/models";
import { AnthropicIconLogo } from "../svg/AnthropicIconLogo";

interface ProviderIconBadgeProps {
  provider: ProviderId;
}

export function ProviderIconBadge({ provider }: ProviderIconBadgeProps) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
      {(() => {
        switch (provider) {
          case "OPEN_AI":
            return <OpenAIIconLogo />;
          case "ANTHROPIC":
            return <AnthropicIconLogo />;
          default:
            return providerLabel(provider).charAt(0);
        }
      })()}
    </div>
  );
}
