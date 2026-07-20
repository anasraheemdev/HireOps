"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type RecentItem = {
  id: string;
  type: "candidate" | "job" | "interview" | "page";
  label: string;
  href: string;
  at: number;
};

const KEY = "hireops-recent";

function read(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as RecentItem[];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(items: RecentItem[]) {
  cache = items.slice(0, 20);
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

function getServerSnapshot(): RecentItem[] {
  return [];
}

export function useRecent() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    cache = read();
    emit();
  }, []);

  const push = useCallback((item: Omit<RecentItem, "at">) => {
    const cur = read().filter((r) => !(r.id === item.id && r.type === item.type));
    write([{ ...item, at: Date.now() }, ...cur]);
  }, []);

  return { items, push };
}
