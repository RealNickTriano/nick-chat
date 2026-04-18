"use client";

import { useEffect, useRef, useState } from "react";
import type { Model, ModelId } from "@/lib/models";
import { CheckIcon } from "@/components/svg/Check";
import { CloseIcon } from "@/components/svg/Close";
import { ModelSelectorButton } from "./ModelSelectorButton";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (next: ModelId) => void;
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

export function ModelSelector({ value, onChange, models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = models.find((m) => m.id === value);
  const selectedLabel = selected?.label ?? value;
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

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: ModelId) => {
    onChange(id);
    close();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // If the click landed on the dialog element itself (not its content), it's the backdrop.
    if (e.target === dialogRef.current) close();
  };

  return (
    <>
      <ModelSelectorButton
        ref={triggerRef}
        label={selectedLabel}
        open={open}
        onClick={() => setOpen(true)}
      />

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={handleBackdropClick}
        aria-label="Select a model"
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Select a model</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:outline-white"
          >
            <CloseIcon />
          </button>
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
                        onClick={() => pick(m.id)}
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
    </>
  );
}
