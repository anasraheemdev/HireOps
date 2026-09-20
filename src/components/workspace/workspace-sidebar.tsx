"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeft,
  Star,
  Clock,
  Building2,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";
import { filterNavByPermissions, navForPortal, portalHome } from "@/lib/nav";
import type { PortalRole } from "@/lib/auth/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLang } from "@/lib/i18n";
import { useWorkspaceUi } from "./workspace-ui-context";
import { useFavorites } from "./favorites-store";
import { useRecent } from "./recent-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HireOpsLogo } from "@/components/brand/hireops-logo";
import { BRAND } from "@/lib/brand";

export function WorkspaceSidebar({ portal }: { portal: PortalRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, hasPermission } = useAuth();
  const { t, navLabel, groupTitle } = useLang();
  const { sidebarCollapsed, toggleSidebar } = useWorkspaceUi();
  const { items: favorites } = useFavorites();
  const { items: recent } = useRecent();

  const groups = filterNavByPermissions(navForPortal(portal), profile?.permissions ?? []).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || hasPermission(i.permission)),
  }));

  const workspaces: { role: PortalRole; label: string; href: string; show: boolean }[] = [
    { role: "hr" as const, label: t("hrWorkspace"), href: portalHome.hr, show: profile?.portalRole !== "candidate" },
    {
      role: "super_admin" as const,
      label: t("adminConsole"),
      href: portalHome.super_admin,
      show: profile?.portalRole === "super_admin",
    },
    {
      role: "candidate" as const,
      label: t("careerPortal"),
      href: portalHome.candidate,
      show: profile?.portalRole === "candidate" || profile?.portalRole === "super_admin",
    },
  ].filter((w) => w.show);

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-[#263140] bg-[#080D16] transition-[width] duration-200",
        sidebarCollapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#263140] px-2.5 h-12">
        <Link href={portalHome[portal]} className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-[#080D16] ring-1 ring-white/10">
            <HireOpsLogo size={32} variant="full" className="h-8 w-8" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight truncate leading-tight text-[#F8FAFC]">{BRAND.name}</p>
              <p className="text-[11px] text-[#94A3B8] font-medium truncate leading-tight mt-0.5" title={BRAND.tagline}>
                {BRAND.tagline}
              </p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="px-2 py-2 border-b border-[#263140]">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9 px-2 text-[12px] cursor-pointer bg-[#111823] hover:bg-[#18212D] border border-[#263140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
                />
              }
            >
              <Building2 className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
              <span className="truncate flex-1 text-left font-medium text-[#F8FAFC]" title={profile?.organizationName ?? "Your organization"}>
                {profile?.organizationName ?? "Your organization"}
              </span>
              <ChevronsUpDown className="h-3 w-3 text-[#94A3B8] shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-[#111823] border-[#263140] text-[#F8FAFC]">
              {workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.role}
                  className="cursor-pointer text-xs text-[#CBD5E1] hover:text-white focus:bg-[#18212D] focus:text-white"
                  onClick={() => router.push(w.href)}
                >
                  {w.label}
                  {w.role === portal && <span className="ml-auto text-[#C5A059] font-semibold text-[10px]">Current</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <ScrollArea className="flex-1 px-2 py-3">
        {!sidebarCollapsed && favorites.length > 0 && (
          <div className="mb-4">
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Star className="h-2.5 w-2.5 text-[#C5A059]" /> Favorites
            </p>
            <ul className="space-y-0.5">
              {favorites.slice(0, 5).map((f) => (
                <li key={`${f.type}-${f.id}`}>
                  <Link
                    href={f.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#CBD5E1] hover:text-white hover:bg-[#18212D] truncate"
                  >
                    {f.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!sidebarCollapsed && recent.length > 0 && (
          <div className="mb-4">
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Clock className="h-2.5 w-2.5 text-[#94A3B8]" /> Recent
            </p>
            <ul className="space-y-0.5">
              {recent.slice(0, 4).map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link
                    href={r.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#CBD5E1] hover:text-white hover:bg-[#18212D] truncate"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav className="space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {groupTitle(group.title)}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isRoot = item.href === "/candidate" || item.href === "/admin" || item.href === "/hr" || item.href === "/dashboard";
                  const active = isRoot ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-md px-2 py-2 text-[12.5px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]",
                          sidebarCollapsed && "justify-center px-0",
                          active
                            ? "text-white bg-[#202733] shadow-[inset_3px_0_0_0] shadow-[#C5A059]"
                            : "text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#C5A059]" : "text-[#CBD5E1]")} />
                        {!sidebarCollapsed && (
                          <span className={cn("flex-1 truncate", active ? "font-semibold text-white" : "text-[#CBD5E1]")}>{navLabel(item.href, item.label)}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
