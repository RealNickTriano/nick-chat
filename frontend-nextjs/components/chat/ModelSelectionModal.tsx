"use client";

import { useEffect, useRef } from "react";
import type { Model, ModelId } from "@/lib/models";
import { CheckIcon } from "@/components/svg/Check";
import { ModelSelectorCloseButton } from "./ModelSelectorCloseButton";

interface ModelSelectionModalProps {
  open: boolean;
  onClose: () => void;
  value: ModelId;
  onPick: (id: ModelId) => void;
  models: Model[];
}

interface ProviderGroup {
  provider: string;
  label: string;
  models: Model[];
}

function groupByProvider(models: Model[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const m of models) {
    const existing = groups.get(m.provider);
    if (existing) {
      existing.models.push(m);
    } else {
      groups.set(m.provider, {
        provider: m.provider,
        label: m.providerLabel,
        models: [m],
      });
    }
  }
  return Array.from(groups.values());
}

export function ModelSelectionModal({
  open,
  onClose,
  value,
  onPick,
  models,
}: ModelSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const groups = groupByProvider(models);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-label="Select a model"
      className="m-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Select a model</h2>
        <ModelSelectorCloseButton onClick={onClose} />
      </div>

      <ul className="max-h-96 overflow-y-auto py-2">
        {groups.map((g) => (
          <li key={g.provider}>
            <div className="px-4 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {g.label}
            </div>
            <ul>
              {g.models.map((m) => {
                const isSelected = m.id === value;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onPick(m.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none aria-[current=true]:bg-neutral-100 aria-[current=true]:font-medium dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800 dark:aria-[current=true]:bg-neutral-800"
                    >
                      <span>{m.label}</span>
                      {isSelected && <CheckIcon />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
