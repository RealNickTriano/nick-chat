"use client";

import { useSyncExternalStore } from "react";

const FAVORITES_KEY = "nick-chat:favorite-models";
const EMPTY: string[] = [];

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(value));
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

interface FavoritesApi {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

export function useFavorites(): FavoritesApi {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggleFavorite = (id: string) => {
    cache = cache.includes(id) ? cache.filter((x) => x !== id) : [...cache, id];
    persist(cache);
    for (const sub of subscribers) sub();
  };

  return { favorites, isFavorite, toggleFavorite };
}
