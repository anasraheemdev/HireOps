"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WorkspaceUiContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  aiDockOpen: boolean;
  setAiDockOpen: (v: boolean) => void;
  toggleAiDock: () => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
};

const WorkspaceUiContext = createContext<WorkspaceUiContextValue | null>(null);
const SIDEBAR_KEY = "hireops-sidebar-collapsed";
const AI_KEY = "hireops-ai-dock-open";

export function WorkspaceUiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [aiDockOpen, setAiDockOpenState] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(localStorage.getItem(SIDEBAR_KEY) === "1");
    setAiDockOpenState(localStorage.getItem(AI_KEY) === "1");
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const setAiDockOpen = useCallback((v: boolean) => {
    setAiDockOpenState(v);
    localStorage.setItem(AI_KEY, v ? "1" : "0");
  }, []);

  const toggleAiDock = useCallback(() => {
    setAiDockOpenState((prev) => {
      const next = !prev;
      localStorage.setItem(AI_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleAiDock();
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar, toggleAiDock]);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      aiDockOpen,
      setAiDockOpen,
      toggleAiDock,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      aiDockOpen,
      setAiDockOpen,
      toggleAiDock,
      shortcutsOpen,
    ]
  );

  return <WorkspaceUiContext.Provider value={value}>{children}</WorkspaceUiContext.Provider>;
}

export function useWorkspaceUi() {
  const ctx = useContext(WorkspaceUiContext);
  if (!ctx) throw new Error("useWorkspaceUi must be used within WorkspaceUiProvider");
  return ctx;
}
