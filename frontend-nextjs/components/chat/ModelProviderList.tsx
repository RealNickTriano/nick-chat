"use client";

import { providerColor } from "@/components/chat/AgentAvatar";
import { providerLabel } from "@/lib/models";
import type { ProviderId } from "@/types/model";

interface ModelProviderListProps {
  providers: ProviderId[];
  activeProvider: ProviderId | null;
  searchActive: boolean;
  providerMatchCount: Map<ProviderId, number>;
  onProviderClick: (provider: ProviderId) => void;
}

export function ModelProviderList({
  providers,
  activeProvider,
  searchActive,
  providerMatchCount,
  onProviderClick,
}: ModelProviderListProps) {
  return (
    <nav className="w-44 shrink-0 overflow-y-auto border-r border-neutral-200 p-2 dark:border-neutral-800">
      <div className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        Providers
      </div>
      <ul className="flex flex-col gap-0.5">
        {providers.map((p) => {
          const isActive = !searchActive && activeProvider === p;
          const count = searchActive ? (providerMatchCount.get(p) ?? 0) : null;
          const dimmed = searchActive && count === 0;
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => onProviderClick(p)}
                disabled={dimmed}
                aria-current={isActive ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-900"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                } ${dimmed ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: providerColor(p) }}
                  />
                  <span className="truncate text-neutral-900 dark:text-neutral-100">
                    {providerLabel(p)}
                  </span>
                </span>
                {count !== null && (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
