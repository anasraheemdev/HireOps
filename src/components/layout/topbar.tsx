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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useLang } from "@/lib/i18n";
import { MobileNav } from "./mobile-nav";
import { useAuth } from "@/lib/auth/auth-provider";
import { breadcrumbLabel } from "@/lib/nav";
import { useCommandPalette } from "./command-palette-context";
import { useNotificationsQuery, useMarkNotificationMutation } from "@/lib/queries/use-candidate-portal";
import { avatarColorFor, initialsOf, formatRelativeTime, cn } from "@/lib/utils";
import { dicebearDataUri } from "@/components/avatar/speaking-avatar";

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

export function Topbar() {
  const crumbs = useBreadcrumb();
  const { t } = useLang();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { toggle } = useCommandPalette();
  const { data: notificationsRaw } = useNotificationsQuery();
  const markRead = useMarkNotificationMutation();
  const notifications = (notificationsRaw ?? []) as unknown as NotificationRow[];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const settingsHref =
    profile?.portalRole === "candidate"
      ? "/candidate/settings"
      : profile?.portalRole === "super_admin"
        ? "/admin"
        : "/hr/settings";
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

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-6 border-b border-[#263140] bg-[#0C1018]/95 backdrop-blur-xl shrink-0">
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden cursor-pointer text-[#CBD5E1]" />}>
          <Menu className="h-5 w-5 text-[#CBD5E1]" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-[#080D16] border-[#263140]">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex items-center gap-1.5 text-sm text-[#CBD5E1] min-w-0">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />}
            {i === crumbs.length - 1 ? (
              <span className="text-[#F8FAFC] font-semibold truncate">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-[#CBD5E1] hover:text-white transition-colors truncate cursor-pointer">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={toggle}
        className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] bg-[#151C28] hover:bg-[#1C2535] border border-[#263140] rounded-xl px-3 py-1.5 w-64 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
      >
        <Search className="h-4 w-4 text-[#94A3B8]" />
        <span className="truncate text-[#CBD5E1]">{t("searchShort")}</span>
        <kbd className="ml-auto text-[10px] font-mono text-[#CBD5E1] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <Button variant="ghost" size="icon" className="sm:hidden cursor-pointer text-[#CBD5E1]" onClick={toggle}>
        <Search className="h-5 w-5" />
      </Button>

      <LanguageSwitcher variant="compact" className="text-[#CBD5E1] hover:text-white" />

      <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-[11px] font-medium text-emerald-300">{t("aiOnline")}</span>
      </div>

      <Popover>
        <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative cursor-pointer text-[#CBD5E1] hover:text-white hover:bg-[#18212D]" />}>
          <Bell className="h-5 w-5 text-[#CBD5E1]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 bg-[#111823] border border-[#263140] text-[#F8FAFC]">
          <div className="px-4 py-3 border-b border-[#263140] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#F8FAFC]">{t("notifications")}</p>
            <Badge variant="secondary" className="text-[10px] bg-[#18212D] text-[#C5A059]">
              {unreadCount} new
            </Badge>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-[#94A3B8]">{t("noNotifications")}</div>
            )}
            {notifications.slice(0, 20).map((n) => (
              <button
                key={n.id}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-[#263140]/50 last:border-0 hover:bg-[#18212D] transition-colors cursor-pointer",
                  !n.is_read && "bg-[#18212D]/60"
                )}
              >
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn("bg-gradient-to-br text-white text-[11px] font-semibold", avatarColorFor(n.type || n.title))}>
                      {initialsOf(n.title)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate flex items-center gap-1.5 text-[#F8FAFC]">
                      {n.title}
                      {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />}
                    </p>
                    {n.body && <p className="text-[11px] text-[#CBD5E1] line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 pl-1 pr-1 cursor-pointer">
          <Avatar className="h-8 w-8 border border-[#263140] ring-1 ring-[#C5A059]/40 hover:ring-[#C5A059]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profileAvatar} alt="" className="h-full w-full object-cover" />
            <AvatarFallback className="gradient-brand text-white text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="text-sm font-medium truncate">{profile?.fullName ?? profile?.email ?? "Loading..."}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">
                {profile?.roleName ?? "No role assigned"}
                {profile?.departmentName ? ` · ${profile.departmentName}` : ""}
              </p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(settingsHref)}>
            <UserRound className="h-4 w-4" /> {t("profile")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(settingsHref)}>
            <SettingsIcon className="h-4 w-4" /> {t("settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-rose-400 focus:text-rose-400"
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" /> {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
