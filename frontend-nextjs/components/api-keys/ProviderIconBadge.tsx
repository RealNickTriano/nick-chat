import type { ReactNode } from "react";

interface ProviderIconBadgeProps {
  children: ReactNode;
}

export function ProviderIconBadge({ children }: ProviderIconBadgeProps) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
      {children}
    </div>
  );
}
