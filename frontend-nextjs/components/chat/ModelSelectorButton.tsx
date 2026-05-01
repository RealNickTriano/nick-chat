"use client";

import type { Ref } from "react";
import { ChevronDownIcon } from "@/components/svg/ChevronDown";
import { ProviderIconBadge } from "@/components/api-keys/ProviderIconBadge";
import type { ProviderId } from "@/types/model";

interface ModelSelectorButtonProps {
  label: string;
  open: boolean;
  onClick: () => void;
  providerId?: ProviderId;
  ref?: Ref<HTMLButtonElement>;
}

export function ModelSelectorButton({
  label,
  open,
  onClick,
  providerId,
  ref,
}: ModelSelectorButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-[5px] text-xs text-[var(--text)] transition-colors hover:bg-[var(--bg3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {providerId && <ProviderIconBadge provider={providerId} size="sm" />}
      <span className="font-bold">{label}</span>
      <ChevronDownIcon className="text-[var(--text3)]" />
    </button>
  );
}
