"use client";

import { useCallback, useSyncExternalStore } from "react";

export type RecentItem = {
  id: string;
  type: "candidate" | "job" | "interview" | "page";
  label: string;
  href: string;
  at: number;
};

const KEY = "hireops-recent";
const EMPTY: RecentItem[] = [];

function read(): RecentItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is RecentItem => !!item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.label === 'string' && typeof item.href === 'string' && typeof item.at === 'number') : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(items: RecentItem[]) {
  cache = items.slice(0, 20);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* Keep in-memory history when storage is unavailable. */ }
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

function getServerSnapshot(): RecentItem[] {
  return EMPTY;
}

export function useRecent() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const push = useCallback((item: Omit<RecentItem, "at">) => {
    const cur = read().filter((r) => !(r.id === item.id && r.type === item.type));
    write([{ ...item, at: Date.now() }, ...cur]);
  }, []);

  return { items, push };
}
