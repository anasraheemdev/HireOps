"use client";

import { useCallback, useSyncExternalStore } from "react";

export type FavItem = {
  id: string;
  type: "candidate" | "job" | "interview" | "page";
  label: string;
  href: string;
};

const KEY = "hireops-favorites";
// React compares snapshots by identity, including during hydration.
const EMPTY: FavItem[] = [];

function read(): FavItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is FavItem => !!item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.label === 'string' && typeof item.href === 'string') : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(items: FavItem[]) {
  cache = items.slice(0, 40);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* Keep in-memory favorites when storage is unavailable. */ }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const sync = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return;
    const next = read();
    if (JSON.stringify(next) !== JSON.stringify(cache)) { cache = next; emit(); }
  };
  window.addEventListener('storage', sync);
  return () => { listeners.delete(cb); window.removeEventListener('storage', sync); };
}

function getSnapshot() {
  return cache;
}

function getServerSnapshot(): FavItem[] {
  return EMPTY;
}

export function useFavorites() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((item: FavItem) => {
    const cur = read();
    const exists = cur.some((f) => f.id === item.id && f.type === item.type);
    write(exists ? cur.filter((f) => !(f.id === item.id && f.type === item.type)) : [item, ...cur]);
  }, []);

  const isFavorite = useCallback(
    (id: string, type: FavItem["type"]) => items.some((f) => f.id === id && f.type === type),
    [items]
  );

  return { items, toggle, isFavorite };
}
