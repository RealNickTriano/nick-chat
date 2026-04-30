"use client";

import type { MouseEvent } from "react";
import { StarIcon } from "@/components/svg/Star";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}

export function FavoriteButton({ isFavorite, onToggle, label, className }: FavoriteButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Unfavorite ${label}` : `Favorite ${label}`}
      className={`cursor-pointer rounded p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white ${
        isFavorite
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
      } ${className ?? ""}`}
    >
      <StarIcon filled={isFavorite} />
    </button>
  );
}
