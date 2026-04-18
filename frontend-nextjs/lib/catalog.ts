"use client";

import { useEffect, useState } from "react";
import { http } from "./http";
import type { Model, ProviderId } from "@/types/model";

interface BackendModel {
  name: string;
  displayName: string;
  description: string | null;
  provider: ProviderId;
}

export type CatalogStatus = "loading" | "ready" | "error";

interface CatalogState {
  status: CatalogStatus;
  models: Model[];
  error: string | null;
}

interface CatalogResult extends CatalogState {
  refetch: () => void;
}

let cached: Model[] | null = null;
let inflight: Promise<Model[]> | null = null;
const subscribers = new Set<(state: CatalogState) => void>();
let lastError: string | null = null;

function notify(state: CatalogState) {
  for (const sub of subscribers) sub(state);
}

async function load(): Promise<Model[]> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = http
    .get<BackendModel[]>("/catalog/chat-only")
    .then((res) => {
      cached = res.data.map((m) => ({
        id: m.name,
        label: m.displayName,
        provider: m.provider,
        description: m.description,
      }));
      lastError = null;
      notify({ status: "ready", models: cached, error: null });
      return cached;
    })
    .catch((err: unknown) => {
      lastError = err instanceof Error ? err.message : "Failed to load models";
      notify({ status: "error", models: [], error: lastError });
      throw err;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useModelCatalog(): CatalogResult {
  const [state, setState] = useState<CatalogState>(() =>
    cached
      ? { status: "ready", models: cached, error: null }
      : { status: "loading", models: [], error: lastError },
  );

  useEffect(() => {
    subscribers.add(setState);
    if (!cached && !inflight) {
      load().catch(() => {});
    }
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const refetch = () => {
    cached = null;
    lastError = null;
    setState({ status: "loading", models: [], error: null });
    notify({ status: "loading", models: [], error: null });
    load().catch(() => {});
  };

  return { ...state, refetch };
}
