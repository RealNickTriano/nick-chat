"use client";

import { useRef, useState } from "react";
import type { Model, ModelId } from "@/lib/models";
import { ModelSelectorButton } from "./ModelSelectorButton";
import { ModelSelectionModal } from "./ModelSelectionModal";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (next: ModelId) => void;
  models: Model[];
}

export function ModelSelector({ value, onChange, models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = models.find((m) => m.id === value);
  const selectedLabel = selected?.label ?? value;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: ModelId) => {
    onChange(id);
    close();
  };

  return (
    <>
      <ModelSelectorButton
        ref={triggerRef}
        label={selectedLabel}
        open={open}
        onClick={() => setOpen(true)}
      />

      <ModelSelectionModal
        open={open}
        onClose={close}
        value={value}
        onPick={pick}
        models={models}
      />
    </>
  );
}
