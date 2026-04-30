"use client";

import type { KeyboardEvent } from "react";
import { FavoriteButton } from "@/components/chat/FavoriteButton";
import { CheckIcon } from "@/components/svg/Check";
import type { Model } from "@/types/model";

interface ModelCardProps {
  model: Model;
  selected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export function ModelCard({
  model,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ModelCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      aria-current={selected ? "true" : undefined}
      aria-label={`Select ${model.displayName}`}
      className={`flex h-full cursor-pointer items-start gap-2 rounded-lg border bg-white p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-neutral-950 dark:focus-visible:outline-white ${
        selected
          ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900"
          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {model.displayName}
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
      </div>

      <FavoriteButton
        isFavorite={isFavorite}
        onToggle={onToggleFavorite}
        label={model.displayName}
      />
    </div>
  );
}
