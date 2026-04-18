import type { Model, ProviderId } from "@/types/model";

export interface ProviderGroup {
  provider: ProviderId;
  models: Model[];
}

export function groupByProvider(models: Model[]): ProviderGroup[] {
  const groups = new Map<ProviderId, Model[]>();
  for (const m of models) {
    const list = groups.get(m.provider);
    if (list) list.push(m);
    else groups.set(m.provider, [m]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }
  return Array.from(groups, ([provider, models]) => ({ provider, models }));
}
