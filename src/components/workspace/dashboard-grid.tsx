"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardWidgetConfig = {
  id: string;
  title: string;
  colSpan?: 1 | 2;
  defaultCollapsed?: boolean;
};

function SortableWidget({
  id,
  title,
  collapsed,
  onToggle,
  colSpan,
  children,
}: {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  colSpan?: 1 | 2;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl overflow-hidden border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-colors",
        colSpan === 2 && "md:col-span-2",
        isDragging && "opacity-90 z-10 ring-1 ring-primary/40 shadow-xl shadow-black/40"
      )}
    >
      <div className="flex items-center gap-1 border-b border-white/[0.06] px-2.5 py-2 bg-white/[0.02]">
        <button
          type="button"
          className="p-0.5 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left cursor-pointer"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-[12px] font-semibold tracking-tight">{title}</span>
        </button>
      </div>
      {!collapsed && <div className="p-3.5 text-[12px]">{children}</div>}
    </div>
  );
}

export function DashboardGrid({
  storageKey,
  widgets,
  renderWidget,
  className,
}: {
  storageKey: string;
  widgets: DashboardWidgetConfig[];
  renderWidget: (id: string) => React.ReactNode;
  className?: string;
}) {
  const defaults = useMemo(() => widgets.map((w) => w.id), [widgets]);
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(`${storageKey}:order`);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        const missing = defaults.filter((id) => !parsed.includes(id));
        return [...parsed.filter((id) => defaults.includes(id)), ...missing];
      }
    } catch {
      /* ignore */
    }
    return defaults;
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return Object.fromEntries(widgets.map((w) => [w.id, !!w.defaultCollapsed]));
    }
    try {
      const raw = localStorage.getItem(`${storageKey}:collapsed`);
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    return Object.fromEntries(widgets.map((w) => [w.id, !!w.defaultCollapsed]));
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const byId = useMemo(() => Object.fromEntries(widgets.map((w) => [w.id, w])), [widgets]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      const next = arrayMove(items, oldIndex, newIndex);
      localStorage.setItem(`${storageKey}:order`, JSON.stringify(next));
      return next;
    });
  };

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(`${storageKey}:collapsed`, JSON.stringify(next));
      return next;
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5", className)}>
          {order.map((id) => {
            const w = byId[id];
            if (!w) return null;
            return (
              <SortableWidget
                key={id}
                id={id}
                title={w.title}
                colSpan={w.colSpan}
                collapsed={!!collapsed[id]}
                onToggle={() => toggle(id)}
              >
                {renderWidget(id)}
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
