"use client";

import { CloseIcon } from "@/components/svg/Close";

interface ModelSelectorCloseButtonProps {
  onClick: () => void;
}

export function ModelSelectorCloseButton({ onClick }: ModelSelectorCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:outline-white cursor-pointer"
    >
      <CloseIcon />
    </button>
  );
}
