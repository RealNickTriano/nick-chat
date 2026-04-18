"use client";

import type { Model, ProviderId } from "@/types/model";
import { ModelCard } from "./ModelCard";
import { ProviderLogo } from "./ProviderLogo";

interface ProviderSectionProps {
  provider: ProviderId;
  models: Model[];
  selectedId: string;
  onPick: (id: string) => void;
}

export function ProviderSection({ provider, models, selectedId, onPick }: ProviderSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex h-6 items-center">
        <ProviderLogo provider={provider} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {models.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            selected={m.id === selectedId}
            onSelect={() => onPick(m.id)}
          />
        ))}
      </div>
    </section>
  );
}
