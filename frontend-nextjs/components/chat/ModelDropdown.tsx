"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { useModelCatalog } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { useRecentModels } from "@/lib/recent-models";
import { ProviderIconBadge } from "@/components/api-keys/ProviderIconBadge";
import type { Model } from "@/types/model";

interface ModelDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  value: string | null;
  onPick: (id: string) => void;
  onBrowseAll: () => void;
}

export function ModelDropdown({
  open,
  onClose,
  anchorRef,
  value,
  onPick,
  onBrowseAll,
}: ModelDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { models } = useModelCatalog();
  const { favorites } = useFavorites();
  const { recent } = useRecentModels();

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const modelById = new Map(models.map((m) => [m.id, m]));

  const favoriteModels: Model[] = favorites
    .map((id) => modelById.get(id))
    .filter((m): m is Model => Boolean(m));
  const favoriteIds = new Set(favoriteModels.map((m) => m.id));
  const recentModels: Model[] = recent
    .map((id) => modelById.get(id))
    .filter((m): m is Model => Boolean(m))
    .filter((m) => !favoriteIds.has(m.id));

  const showFavorites = favoriteModels.length > 0;
  const showRecent = recentModels.length > 0;
  const empty = !showFavorites && !showRecent;

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Quick model selection"
      className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg"
    >
      {showFavorites && (
        <Section title="Favorites">
          {favoriteModels.map((m) => (
            <Row key={m.id} model={m} selected={m.id === value} onClick={() => onPick(m.id)} />
          ))}
        </Section>
      )}
      {showRecent && (
        <Section title="Recent">
          {recentModels.map((m) => (
            <Row key={m.id} model={m} selected={m.id === value} onClick={() => onPick(m.id)} />
          ))}
        </Section>
      )}
      {empty && (
        <div className="px-3 py-3 text-xs text-[var(--text3)]">
          No favorites yet. Browse all models to pick one.
        </div>
      )}
      <div className="border-t border-[var(--border)]">
        <button
          type="button"
          role="menuitem"
          onClick={onBrowseAll}
          className="w-full cursor-pointer px-3 py-2 text-left text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none"
        >
          Browse all models →
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--border)]">
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-[var(--text3)] uppercase">
        {title}
      </div>
      <div className="pb-1">{children}</div>
    </div>
  );
}

function Row({
  model,
  selected,
  onClick,
}: {
  model: Model;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none ${
        selected ? "bg-[var(--bg2)]" : ""
      }`}
    >
      <ProviderIconBadge provider={model.provider} />
      <span className="truncate text-[var(--text)]">{model.displayName}</span>
    </button>
  );
}
