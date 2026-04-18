"use client";

import { CheckIcon } from "@/components/svg/Check";
import type { Model } from "@/types/model";

interface ModelCardProps {
  model: Model;
  selected: boolean;
  onSelect: () => void;
}

export function ModelCard({ model, selected, onSelect }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className="group relative flex h-full min-w-56 flex-1 basis-56 cursor-pointer flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-400 focus-visible:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 aria-current:border-neutral-900 aria-current:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600 dark:focus-visible:border-neutral-600 dark:focus-visible:outline-white dark:aria-current:border-neutral-100 dark:aria-current:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {model.label}
        </span>
        {selected && (
          <span className="text-neutral-900 dark:text-neutral-100">
            <CheckIcon />
          </span>
        )}
      </div>
      {model.description && (
        <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
          {model.description}
        </p>
      )}
    </button>
  );
}
