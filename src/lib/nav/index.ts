import type { LucideIcon } from "lucide-react";
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
  Building2,
  KeyRound,
  Activity,
  Database,
  Flag,
  FileText,
  UserCircle,
  FileUp,
  Bookmark,
  MessageSquare,
  Bell,
  Award,
  HelpCircle,
  Calendar,
  Sparkles,
} from "lucide-react";
import type { PortalRole } from "@/lib/auth/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const portalHome: Record<PortalRole, string> = {
  super_admin: "/admin",
  hr: "/hr/dashboard",
  candidate: "/candidate",
};

export const hrNav: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/hr/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "portal.hr" }],
  },
  {
    title: "Recruitment",
    items: [
      { href: "/hr/candidates", label: "Candidates", icon: Users, permission: "candidates.read" },
      { href: "/hr/jobs", label: "Jobs", icon: Briefcase, permission: "jobs.read" },
      { href: "/hr/ai-matching", label: "AI Matching", icon: Wand2, permission: "candidates.read" },
      { href: "/hr/cv-parsing", label: "CV Parsing", icon: ScanLine, permission: "candidates.write" },
    ],
  },
  {
    title: "Evaluation",
    items: [
      { href: "/hr/assessments", label: "Assessments", icon: ClipboardList, permission: "assessments.read" },
      { href: "/hr/ai-interview", label: "AI Interviews", icon: Bot, permission: "interviews.read" },
      { href: "/hr/calendar", label: "Calendar", icon: Calendar, permission: "interviews.read" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/hr/reports", label: "Reports", icon: BarChart3, permission: "reports.read" },
      { href: "/hr/analytics", label: "Analytics", icon: LineChart, permission: "reports.read" },
    ],
  },
  {
    title: "System",
    items: [{ href: "/hr/settings", label: "Settings", icon: Settings }],
  },
];

export const adminNav: NavGroup[] = [
  {
    title: "Platform",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "portal.admin" },
      { href: "/admin/users", label: "Users", icon: Users, permission: "admin.users.manage" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "admin.roles.manage" },
      { href: "/admin/organization", label: "Organization", icon: Building2, permission: "admin.org.manage" },
    ],
  },
  {
    title: "AI Governance",
    items: [
      { href: "/admin/ai", label: "AI Configuration", icon: Sparkles, permission: "admin.ai.configure" },
      { href: "/admin/prompts", label: "Prompt Library", icon: FileText, permission: "admin.ai.prompts" },
      { href: "/admin/ai-usage", label: "Usage Analytics", icon: Activity, permission: "admin.system.monitor" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/audit", label: "Audit Logs", icon: KeyRound, permission: "audit.read" },
      { href: "/admin/health", label: "System Health", icon: Database, permission: "admin.system.monitor" },
      { href: "/admin/features", label: "Feature Flags", icon: Flag, permission: "admin.feature_flags" },
      { href: "/admin/templates", label: "Templates", icon: ClipboardList, permission: "admin.ai.prompts" },
    ],
  },
  {
    title: "Shortcuts",
    items: [{ href: "/hr/dashboard", label: "Open HR Workspace", icon: Briefcase, permission: "portal.hr" }],
  },
];

export const candidateNav: NavGroup[] = [
  {
    title: "Home",
    items: [
      { href: "/candidate", label: "Dashboard", icon: LayoutDashboard, permission: "portal.candidate" },
      { href: "/candidate/jobs", label: "Browse Jobs", icon: Briefcase, permission: "portal.candidate" },
      { href: "/candidate/applications", label: "My Applications", icon: FileText, permission: "portal.candidate" },
      { href: "/candidate/saved", label: "Saved Jobs", icon: Bookmark, permission: "portal.candidate" },
    ],
  },
  {
    title: "Profile",
    items: [
      { href: "/candidate/profile", label: "My Profile", icon: UserCircle, permission: "portal.candidate" },
      { href: "/candidate/resume", label: "Resume", icon: FileUp, permission: "portal.candidate" },
      { href: "/candidate/documents", label: "Documents", icon: FileText, permission: "portal.candidate" },
    ],
  },
  {
    title: "Evaluation",
    items: [
      { href: "/candidate/assessments", label: "Assessments", icon: ClipboardList, permission: "assessments.read" },
      { href: "/candidate/interviews", label: "AI Interviews", icon: Bot, permission: "interviews.conduct" },
      { href: "/candidate/offers", label: "Offers", icon: Award, permission: "offers.read" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/candidate/messages", label: "Messages", icon: MessageSquare, permission: "messages.read" },
      { href: "/candidate/notifications", label: "Notifications", icon: Bell },
      { href: "/candidate/assistant", label: "Career Assistant", icon: Sparkles, permission: "portal.candidate" },
      { href: "/candidate/help", label: "Help Center", icon: HelpCircle },
      { href: "/candidate/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function navForPortal(portal: PortalRole | null | undefined): NavGroup[] {
  if (portal === "super_admin") return adminNav;
  if (portal === "candidate") return candidateNav;
  return hrNav;
}

export function filterNavByPermissions(groups: NavGroup[], permissions: string[]): NavGroup[] {
  const set = new Set(permissions);
  const isAdmin = set.has("portal.admin");
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!item.permission) return true;
        if (isAdmin) return true;
        return set.has(item.permission);
      }),
    }))
    .filter((g) => g.items.length > 0);
}

export const legacyRedirects: Record<string, string> = {
  "/dashboard": "/hr/dashboard",
  "/candidates": "/hr/candidates",
  "/jobs": "/hr/jobs",
  "/ai-matching": "/hr/ai-matching",
  "/cv-parsing": "/hr/cv-parsing",
  "/assessments": "/hr/assessments",
  "/ai-interview": "/hr/ai-interview",
  "/reports": "/hr/reports",
  "/analytics": "/hr/analytics",
  "/settings": "/hr/settings",
  "/admin": "/admin",
  "/future-vision": "/hr/future-vision",
};

export function breadcrumbLabel(pathname: string): string {
  const all = [...hrNav, ...adminNav, ...candidateNav].flatMap((g) => g.items);
  const hit = all.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  if (hit) return hit.label;
  if (pathname.includes("/candidates/")) return "Candidate Profile";
  return "Overview";
}
