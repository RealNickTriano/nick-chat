"use client";

import { useEffect, useRef, useState } from "react";
import { useModelCatalog } from "@/lib/catalog";
import { useRecentModels } from "@/lib/recent-models";
import type { Model } from "@/types/model";
import { ModelDropdown } from "./ModelDropdown";
import { ModelSelectionModal } from "./ModelSelectionModal";
import { ModelSelectorButton } from "./ModelSelectorButton";

const STORAGE_KEY = "nick-chat:selected-model";

interface ModelSelectorProps {
  value: string | null;
  onChange: (next: Model) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { status, models } = useModelCatalog();
  const { pushRecent } = useRecentModels();

  // Once the catalog is ready, restore the selection from localStorage if present.
  // No fallback to first model — empty selection is a valid state.
  useEffect(() => {
    if (value !== null || status !== "ready" || models.length === 0) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) return;
    const fromStorage = models.find((m) => m.id === stored);
    if (fromStorage) onChange(fromStorage);
  }, [value, status, models, onChange]);

  const selected = value ? models.find((m) => m.id === value) : null;
  const label =
    selected?.displayName ?? (status === "loading" ? "Loading models..." : "Select a model");

  const closeModal = () => {
    setModalOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: string) => {
    const next = models.find((m) => m.id === id);
    if (!next) return;
    onChange(next);
    pushRecent(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    setDropdownOpen(false);
    setModalOpen(false);
    triggerRef.current?.focus();
  };

  const handleBrowseAll = () => {
    setDropdownOpen(false);
    setModalOpen(true);
  };

  return (
    <>
      <div className="relative">
        <ModelSelectorButton
          ref={triggerRef}
          label={label}
          open={dropdownOpen}
          onClick={() => setDropdownOpen((v) => !v)}
          providerId={selected?.provider}
        />
        <ModelDropdown
          open={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
          anchorRef={triggerRef}
          value={value}
          onPick={pick}
          onBrowseAll={handleBrowseAll}
        />
      </div>

      <ModelSelectionModal open={modalOpen} onClose={closeModal} value={value} onPick={pick} />
    </>
  );
}
