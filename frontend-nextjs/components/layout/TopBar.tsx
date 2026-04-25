"use client";

import { BarChartIcon } from "@/components/svg/BarChart";
import { ChevronRightIcon } from "@/components/svg/ChevronRight";
import { LayersIcon } from "@/components/svg/Layers";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  title: string;
  subtitle?: string;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text2)] transition-colors hover:bg-[var(--bg3)]";

export function TopBar({
  title,
  subtitle,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      {!leftOpen && (
        <button
          type="button"
          onClick={onToggleLeft}
          className={iconButton}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <ChevronRightIcon size={15} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
            <LayersIcon size={10} />
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
      <ThemeToggle />
      {/* {!rightOpen && (
        <button
          type="button"
          onClick={onToggleRight}
          className={iconButton}
          aria-label="Show session stats"
          title="Show stats"
        >
          <BarChartIcon size={15} />
        </button>
      )} */}
    </div>
  );
}
