"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/svg/ChevronDown";
import type { Model, ProviderId } from "@/types/model";
import { ModelCard } from "./ModelCard";
import { ProviderLogo } from "./ProviderLogo";

interface ProviderSectionProps {
  provider: ProviderId;
  models: Model[];
  selectedId: string;
  onPick: (id: string) => void;
  defaultOpen?: boolean;
}

export function ProviderSection({
  provider,
  models,
  selectedId,
  onPick,
  defaultOpen = true,
}: ProviderSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = `provider-section-${provider}`;

  return (
    <section className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={sectionId}
        className="flex cursor-pointer items-center justify-between rounded-md py-1 text-left transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-900 dark:focus-visible:bg-neutral-900"
      >
        <div className="flex h-12 items-center">
          <ProviderLogo provider={provider} />
        </div>
        <ChevronDownIcon
          className={`mr-2 h-5 w-5 text-neutral-500 transition-transform duration-300 ease-out dark:text-neutral-400 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        id={sectionId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 pt-3">
            {models.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={m.id === selectedId}
                onSelect={() => onPick(m.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
