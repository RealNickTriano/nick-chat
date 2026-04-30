"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModelCard } from "@/components/chat/ModelCard";
import { ModelProviderList } from "@/components/chat/ModelProviderList";
import { ModelSelectorCloseButton } from "@/components/chat/ModelSelectorCloseButton";
import { SearchIcon } from "@/components/svg/Search";
import { useModelCatalog } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { providerLabel } from "@/lib/models";
import type { Model, ProviderId } from "@/types/model";

interface ModelSelectionModalProps {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onPick: (id: string) => void;
}

export function ModelSelectionModal({ open, onClose, value, onPick }: ModelSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { status, models, error, refetch } = useModelCatalog();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [explicitProvider, setExplicitProvider] = useState<ProviderId | null>(null);
  const [search, setSearch] = useState("");
  const groupRefs = useRef<Map<ProviderId, HTMLElement>>(new Map());

  const providers = useMemo(() => {
    const seen = new Set<ProviderId>();
    const list: ProviderId[] = [];
    for (const m of models) {
      if (!seen.has(m.provider)) {
        seen.add(m.provider);
        list.push(m.provider);
      }
    }
    return list;
  }, [models]);

  const activeProvider: ProviderId | null = (() => {
    if (explicitProvider !== null && providers.includes(explicitProvider)) return explicitProvider;
    if (providers.length === 0) return null;
    const fromValue = value ? models.find((m) => m.id === value)?.provider : null;
    return fromValue && providers.includes(fromValue) ? fromValue : providers[0];
  })();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogClose = () => {
    setSearch("");
    setExplicitProvider(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const searchLower = search.trim().toLowerCase();
  const searchActive = searchLower.length > 0;

  const matches = useMemo(() => {
    return (m: Model) =>
      m.displayName.toLowerCase().includes(searchLower) || m.id.toLowerCase().includes(searchLower);
  }, [searchLower]);

  const providerMatchCount = useMemo(() => {
    if (!searchActive) return new Map<ProviderId, number>();
    const counts = new Map<ProviderId, number>();
    for (const m of models) {
      if (matches(m)) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
    }
    return counts;
  }, [models, matches, searchActive]);

  const visibleProviders: ProviderId[] = searchActive
    ? providers.filter((p) => (providerMatchCount.get(p) ?? 0) > 0)
    : activeProvider
      ? [activeProvider]
      : [];

  const modelsForProvider = (p: ProviderId) =>
    models.filter((m) => m.provider === p && (!searchActive || matches(m)));

  const handleProviderClick = (p: ProviderId) => {
    if (searchActive) {
      groupRefs.current.get(p)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setExplicitProvider(p);
    }
  };

  const noResults = searchActive && visibleProviders.length === 0;
  const hasModels = status === "ready" && providers.length > 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      aria-label="Select a model"
      className="m-auto h-full max-h-[80vh] w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/70 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Select a model</h2>
          <ModelSelectorCloseButton onClick={onClose} />
        </div>

        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              aria-label="Search models"
              className="w-full rounded-md border border-neutral-200 bg-white py-2 pr-3 pl-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <ModelProviderList
            providers={providers}
            activeProvider={activeProvider}
            searchActive={searchActive}
            providerMatchCount={providerMatchCount}
            onProviderClick={handleProviderClick}
          />

          <div className="flex-1 overflow-y-auto p-4">
            {status === "loading" && <SkeletonGrid />}
            {status === "error" && (
              <ErrorState message={error ?? "Failed to load models"} onRetry={refetch} />
            )}
            {status === "ready" && providers.length === 0 && <EmptyState />}
            {hasModels && noResults && (
              <p className="py-12 text-center text-sm text-neutral-600 dark:text-neutral-400">
                No models match your search.
              </p>
            )}
            {hasModels && !noResults && (
              <div className="flex flex-col gap-6">
                {visibleProviders.map((p) => (
                  <section
                    key={p}
                    ref={(el) => {
                      if (el) groupRefs.current.set(p, el);
                      else groupRefs.current.delete(p);
                    }}
                  >
                    {searchActive && (
                      <h3 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {providerLabel(p)}
                      </h3>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
                      {modelsForProvider(p).map((m) => (
                        <ModelCard
                          key={m.id}
                          model={m}
                          selected={m.id === value}
                          isFavorite={isFavorite(m.id)}
                          onSelect={() => onPick(m.id)}
                          onToggleFavorite={() => toggleFavorite(m.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
          />
        ))}
      </div>
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
