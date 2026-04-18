import { AnthropicLogo } from "@/components/svg/AnthropicLogo";
import { OpenAILogo } from "@/components/svg/OpenAILogo";
import { providerLabel } from "@/lib/models";
import type { ProviderId } from "@/types/model";

interface ProviderLogoProps {
  provider: ProviderId;
  className?: string;
}

export function ProviderLogo({ provider, className }: ProviderLogoProps) {
  const label = providerLabel(provider);

  switch (provider) {
    case "ANTHROPIC":
      return (
        <AnthropicLogo
          className={className ?? "h-5 w-auto text-neutral-900 dark:text-neutral-100"}
          aria-label={label}
        />
      );
    case "OPEN_AI":
      return (
        <OpenAILogo
          className={className ?? "h-14 w-auto text-neutral-900 dark:text-neutral-100"}
          aria-label={label}
        />
      );
    default:
      return (
        <span
          className={
            className ??
            "text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100"
          }
        >
          {label}
        </span>
      );
  }
}
