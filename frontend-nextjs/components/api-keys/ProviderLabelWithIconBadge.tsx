import type { ProviderId } from "@/types/model";
import { ProviderIconBadge } from "./ProviderIconBadge";

interface ProviderLabelWithIconBadgeProps {
  provider: ProviderId;
  label: string;
}

export function ProviderLabelWithIconBadge({ provider, label }: ProviderLabelWithIconBadgeProps) {
  return (
    <>
      <ProviderIconBadge provider={provider} />
      <span className="shrink-0 text-[13px] font-medium text-[var(--text)]">{label}</span>
    </>
  );
}
