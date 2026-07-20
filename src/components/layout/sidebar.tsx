"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wand2,
  ScanLine,
  ClipboardList,
  Bot,
  BarChart3,
  LineChart,
  Settings,
  ShieldCheck,
  Rocket,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Recruitment",
    items: [
      { href: "/candidates", label: "Candidates", icon: Users },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/ai-matching", label: "AI Matching", icon: Wand2 },
      { href: "/cv-parsing", label: "CV Parsing", icon: ScanLine },
    ],
  },
  {
    title: "Evaluation",
    items: [
      { href: "/assessments", label: "Assessments", icon: ClipboardList },
      { href: "/ai-interview", label: "AI Interviews", icon: Bot },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: ShieldCheck },
    ],
  },
  {
    title: "Vision",
    items: [{ href: "/future-vision", label: "Future Vision", icon: Rocket, badge: "New" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex h-screen sticky top-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl z-30"
    >
      <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
          <HireOpsLogo size={36} variant="full" className="h-9 w-9" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-semibold leading-tight truncate">{BRAND.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{BRAND.tagline}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2.5 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                const link = (
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl gradient-brand opacity-90"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon className={cn("h-4.5 w-4.5 shrink-0 relative z-10", active && "text-white")} strokeWidth={2} />
                    {!collapsed && (
                      <span className={cn("relative z-10 truncate", active && "text-white")}>{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="relative z-10 ml-auto text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
                return collapsed ? (
                  <div key={item.href} title={item.label}>
                    {link}
                  </div>
                ) : (
                  <div key={item.href}>{link}</div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2.5 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4.5 w-4.5" /> : <ChevronsLeft className="h-4.5 w-4.5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
