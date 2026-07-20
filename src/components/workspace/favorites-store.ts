"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type FavItem = {
  id: string;
  type: "candidate" | "job" | "interview" | "page";
  label: string;
  href: string;
};

const KEY = "hireops-favorites";

function read(): FavItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as FavItem[];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(items: FavItem[]) {
  cache = items.slice(0, 40);
  localStorage.setItem(KEY, JSON.stringify(cache));
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return cache;
}

function getServerSnapshot(): FavItem[] {
  return [];
}

export function useFavorites() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    cache = read();
    emit();
  }, []);

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
