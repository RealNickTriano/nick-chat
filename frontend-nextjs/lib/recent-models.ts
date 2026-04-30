"use client";

import { useSyncExternalStore } from "react";

const RECENT_KEY = "nick-chat:recent-models";
const MAX_RECENT = 5;
const EMPTY: string[] = [];

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT)
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

let cache: string[] = typeof window !== "undefined" ? read() : EMPTY;
const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): string[] {
  return cache;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

interface RecentModelsApi {
  recent: string[];
  pushRecent: (id: string) => void;
}

export function useRecentModels(): RecentModelsApi {
  const recent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pushRecent = (id: string) => {
    cache = [id, ...cache.filter((x) => x !== id)].slice(0, MAX_RECENT);
    persist(cache);
    for (const sub of subscribers) sub();
  };

  return { recent, pushRecent };
}
