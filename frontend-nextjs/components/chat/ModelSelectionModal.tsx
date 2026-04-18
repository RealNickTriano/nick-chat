"use client";

import { useEffect, useRef } from "react";
import { useModelCatalog } from "@/lib/catalog";
import type { Model, ProviderId } from "@/types/model";
import { ModelSelectorCloseButton } from "./ModelSelectorCloseButton";
import { ProviderSection } from "./ProviderSection";

interface ModelSelectionModalProps {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onPick: (id: string) => void;
}

interface ProviderGroup {
  provider: ProviderId;
  models: Model[];
}

function groupByProvider(models: Model[]): ProviderGroup[] {
  const groups = new Map<ProviderId, Model[]>();
  for (const m of models) {
    const list = groups.get(m.provider);
    if (list) list.push(m);
    else groups.set(m.provider, [m]);
  }
  return Array.from(groups, ([provider, models]) => ({ provider, models }));
}

export function ModelSelectionModal({ open, onClose, value, onPick }: ModelSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status, models, error, refetch } = useModelCatalog();

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

  const groups = status === "ready" ? groupByProvider(models) : [];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-label="Select a model"
      className="m-auto w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Select a model</h2>
        <ModelSelectorCloseButton onClick={onClose} />
      </div>

      <div className="max-h-112 overflow-y-auto p-4">
        {status === "loading" && <SkeletonGrid />}
        {status === "error" && (
          <ErrorState message={error ?? "Failed to load models"} onRetry={refetch} />
        )}
        {status === "ready" && models.length === 0 && <EmptyState />}
        {status === "ready" && models.length > 0 && (
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <ProviderSection
                key={g.provider}
                provider={g.provider}
                models={g.models}
                selectedId={value ?? ""}
                onPick={onPick}
              />
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1].map((s) => (
        <div key={s} className="flex flex-col gap-3">
          <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-white"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-sm text-neutral-600 dark:text-neutral-400">
      No models available.
    </div>
  );
}
