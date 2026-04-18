"use client";

import type { Ref } from "react";

interface ModelSelectorButtonProps {
  label: string;
  open: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function ModelSelectorButton({ label, open, onClick, ref }: ModelSelectorButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-transparent px-2.5 text-sm text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900 dark:focus-visible:outline-white"
    >
      <span>{label}</span>
    </button>
  );
}
