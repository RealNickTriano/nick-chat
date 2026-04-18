"use client";

import { useEffect, useRef, useState } from "react";
import { useModelCatalog } from "@/lib/catalog";
import { ModelSelectorButton } from "./ModelSelectorButton";
import { ModelSelectionModal } from "./ModelSelectionModal";

const STORAGE_KEY = "nick-chat:selected-model";

interface ModelSelectorProps {
  value: string | null;
  onChange: (next: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { status, models } = useModelCatalog();

  // Once the catalog is ready, default the selection from localStorage or the first model.
  useEffect(() => {
    if (value !== null || status !== "ready" || models.length === 0) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initial = stored && models.some((m) => m.id === stored) ? stored : models[0].id;
    onChange(initial);
  }, [value, status, models, onChange]);

  const selected = value ? models.find((m) => m.id === value) : null;
  const label = selected?.label ?? (status === "loading" ? "Loading models..." : "Select model");

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: string) => {
    onChange(id);
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
      />

      <ModelSelectionModal open={open} onClose={close} value={value} onPick={pick} />
    </>
  );
}
