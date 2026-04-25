"use client";

import { useEffect, useRef, useState } from "react";
import { useModelCatalog } from "@/lib/catalog";
import type { Model } from "@/types/model";
import { ModelSelectorButton } from "./ModelSelectorButton";
import { ModelSelectionModal } from "./ModelSelectionModal";

const STORAGE_KEY = "nick-chat:selected-model";

interface ModelSelectorProps {
  value: string | null;
  onChange: (next: Model) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { status, models } = useModelCatalog();

  // Once the catalog is ready, default the selection from localStorage or the first model.
  useEffect(() => {
    if (value !== null || status !== "ready" || models.length === 0) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const fromStorage = stored ? models.find((m) => m.id === stored) : undefined;
    onChange(fromStorage ?? models[0]);
  }, [value, status, models, onChange]);

  const selected = value ? models.find((m) => m.id === value) : null;
  const label = selected?.label ?? (status === "loading" ? "Loading models..." : "Select model");

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: string) => {
    const next = models.find((m) => m.id === id);
    if (!next) return;
    onChange(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    close();
  };

  return (
    <>
      <ModelSelectorButton
        ref={triggerRef}
        label={label}
        open={open}
        onClick={() => setOpen(true)}
        providerId={selected?.provider}
      />

      <ModelSelectionModal open={open} onClose={close} value={value} onPick={pick} />
    </>
  );
}
