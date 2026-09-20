"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronRight,
  Menu,
  LogOut,
  Settings as SettingsIcon,
  UserRound,
  Sparkles,
  Keyboard,
  PanelLeft,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLang } from "@/lib/i18n";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/lib/auth/auth-provider";
import { breadcrumbLabel } from "@/lib/nav";
import { useCommandPalette } from "@/components/layout/command-palette-context";
import { useNotificationsQuery, useMarkNotificationMutation } from "@/lib/queries/use-candidate-portal";
import { avatarColorFor, initialsOf, formatRelativeTime, cn } from "@/lib/utils";
import { dicebearDataUri } from "@/components/avatar/speaking-avatar";
import { QuickCreate } from "./quick-create";
import { useWorkspaceUi } from "./workspace-ui-context";
import type { PortalRole } from "@/lib/auth/types";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

function useBreadcrumb() {
  const pathname = usePathname() || "/hr/dashboard";
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label =
      seg === "hr" || seg === "admin" || seg === "candidate"
        ? seg === "hr"
          ? "HR"
          : seg === "admin"
            ? "Admin"
            : "Candidate"
        : breadcrumbLabel(href) !== "Overview"
          ? breadcrumbLabel(href)
          : seg.length > 12
            ? "Profile"
            : seg.charAt(0).toUpperCase() + seg.slice(1);
    return { href, label };
  });
}

export function WorkspaceToolbar({ portal }: { portal: PortalRole }) {
  const crumbs = useBreadcrumb();
  const { t, lang, toggleLang } = useLang();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { toggle } = useCommandPalette();
  const { toggleSidebar, toggleAiDock, aiDockOpen, setShortcutsOpen, sidebarCollapsed } = useWorkspaceUi();
  const { data: notificationsRaw } = useNotificationsQuery();
  const markRead = useMarkNotificationMutation();
  const notifications = (notificationsRaw ?? []) as unknown as NotificationRow[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const settingsHref =
    portal === "candidate" ? "/candidate/settings" : portal === "super_admin" ? "/admin" : "/hr/settings";
  const profileSeed = profile?.email || profile?.fullName || "user";
  const profileAvatar = dicebearDataUri(profileSeed, 64);
  const initials =
    profile?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    profile?.email?.slice(0, 2).toUpperCase() ??
    "?";

  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "Workspace";

  return (
    <header className="sticky top-0 z-20 h-12 flex items-center gap-3 px-3 border-b border-[#263140] bg-[#0C1018]/95 backdrop-blur-xl shrink-0">
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 cursor-pointer text-[#CBD5E1]" />}>
          <Menu className="h-4 w-4 text-[#CBD5E1]" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-[#080D16] border-[#263140]">
          <MobileNav />
        </SheetContent>
      </Sheet>

      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex h-8 w-8 cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          onClick={toggleSidebar}
          title="Expand sidebar (⌘B)"
        >
          <PanelLeft className="h-4 w-4 text-[#CBD5E1]" />
        </Button>
      )}

      <nav className="min-w-0 flex items-center gap-1 text-[12px]" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-[#94A3B8] shrink-0" />}
              {isLast ? (
                <span className="font-semibold tracking-tight truncate text-[#F8FAFC]">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-[#CBD5E1] hover:text-white transition-colors truncate">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
        <span className="sr-only">{pageTitle}</span>
      </nav>

      <div className="flex-1 flex justify-center px-2">
        <button
          onClick={toggle}
          className="hidden sm:flex items-center gap-2 text-[12px] text-[#94A3B8] bg-[#151C28] hover:bg-[#1C2535] border border-[#263140] rounded-lg px-3 h-8 w-full max-w-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
          <span className="truncate flex-1 text-left text-[#CBD5E1]">{t("search")}</span>
          <kbd className="text-[10px] font-mono text-[#CBD5E1] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <QuickCreate portal={portal} />

        <div className="mx-1.5 h-5 w-px bg-[#263140] hidden md:block" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
          onClick={toggleLang}
          title={lang === "en" ? "العربية" : "English"}
        >
          <Languages className="h-4 w-4" />
        </Button>

        {portal !== "candidate" && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 cursor-pointer",
              aiDockOpen ? "text-[#C5A059] bg-[#C5A059]/15" : "text-[#CBD5E1] hover:text-white hover:bg-[#18212D]"
            )}
            onClick={toggleAiDock}
            title="AI Copilot (⌘J)"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D] hidden sm:inline-flex"
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="relative h-8 w-8 cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D]" />
            }
          >
            <Bell className="h-4 w-4 text-[#CBD5E1]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-semibold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 border-[#263140] bg-[#111823] text-[#F8FAFC]">
            <div className="px-3 py-2.5 border-b border-[#263140] flex items-center justify-between">
              <p className="text-xs font-semibold text-[#F8FAFC]">{t("notifications")}</p>
              <Badge variant="secondary" className="text-[9px] bg-[#18212D] text-[#C5A059]">
                {unreadCount} new
              </Badge>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 && (
                <div className="px-3 py-8 text-center text-[11px] text-[#94A3B8]">{t("noNotifications")}</div>
              )}
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-[#263140]/50 last:border-0 hover:bg-[#18212D] cursor-pointer",
                    !n.is_read && "bg-[#18212D]/60"
                  )}
                >
                  <div className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0" size="sm">
                      <AvatarFallback className={cn("bg-gradient-to-br text-white text-[10px]", avatarColorFor(n.type || n.title))}>
                        {initialsOf(n.title)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate text-[#F8FAFC]">{n.title}</p>
                      {n.body && <p className="text-[10px] text-[#CBD5E1] line-clamp-2">{n.body}</p>}
                      <p className="text-[9px] text-[#94A3B8] mt-0.5">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex items-center cursor-pointer rounded-full ring-1 ring-[#263140] hover:ring-[#C5A059] transition-all">
            <Avatar className="h-8 w-8" size="sm">
              <AvatarImage src={profileAvatar} alt="" />
              <AvatarFallback className="gradient-brand text-white text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-xs font-medium truncate">{profile?.fullName ?? profile?.email}</p>
                <p className="text-[10px] text-muted-foreground font-normal truncate">
                  {profile?.roleName}
                  {profile?.organizationName ? ` · ${profile.organizationName}` : ""}
                </p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => router.push(settingsHref)}>
              <UserRound className="h-3.5 w-3.5" /> {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => router.push(settingsHref)}>
              <SettingsIcon className="h-3.5 w-3.5" /> {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-xs text-rose-400"
              onClick={async () => {
                await signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
