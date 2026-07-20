"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

export type Lang = "en" | "ar";

const dictionary = {
  en: {
    appName: "HireOps",
    appNameShort: "HireOps",
    tagline: "AI Recruitment Operations Platform",
    welcomeBack: "Welcome to HireOps",
    loginSubtitle: "Enterprise AI Recruitment Operations Platform",
    email: "Email Address",
    password: "Password",
    signIn: "Sign In",
    ssoLogin: "Continue with Government SSO",
    forgotPassword: "Forgot password?",
    rememberMe: "Remember me",
    dashboard: "Dashboard",
    candidates: "Candidates",
    jobs: "Jobs",
    aiMatching: "AI Matching",
    cvParsing: "CV Parsing",
    assessments: "Assessments",
    aiInterviews: "AI Interviews",
    reports: "Reports",
    analytics: "Analytics",
    settings: "Settings",
    admin: "Admin",
    futureVision: "Future Vision",
    search: "Search candidates, jobs, reports...",
    searchShort: "Search...",
    notifications: "Notifications",
    aiOnline: "AI Engine Online",
    signOut: "Sign Out",
    profile: "Profile",
    // portals
    adminConsole: "Admin Console",
    hrWorkspace: "HR Workspace",
    careerPortal: "Career Portal",
    // nav groups
    overview: "Overview",
    recruitment: "Recruitment",
    evaluation: "Evaluation",
    insights: "Insights",
    system: "System",
    platform: "Platform",
    aiGovernance: "AI Governance",
    operations: "Operations",
    shortcuts: "Shortcuts",
    home: "Home",
    support: "Support",
    // candidate nav
    browseJobs: "Browse Jobs",
    myApplications: "My Applications",
    savedJobs: "Saved Jobs",
    myProfile: "My Profile",
    resume: "Resume",
    documents: "Documents",
    offers: "Offers",
    messages: "Messages",
    careerAssistant: "Career Assistant",
    helpCenter: "Help Center",
    calendar: "Calendar",
    openHrWorkspace: "Open HR Workspace",
    users: "Users",
    rolesPermissions: "Roles & Permissions",
    organization: "Organization",
    aiConfiguration: "AI Configuration",
    promptLibrary: "Prompt Library",
    usageAnalytics: "Usage Analytics",
    auditLogs: "Audit Logs",
    systemHealth: "System Health",
    featureFlags: "Feature Flags",
    templates: "Templates",
    // common
    language: "Language",
    markRead: "Mark read",
    noNotifications: "You're all caught up",
    speaking: "Speaking…",
    listen: "Listen",
    muteVoice: "Mute voice",
    unmuteVoice: "Unmute voice",
    interviewer: "Amina",
    interviewerRole: "AI Interviewer",
  },
  ar: {
    appName: "HireOps",
    appNameShort: "HireOps",
    tagline: "منصة عمليات التوظيف بالذكاء الاصطناعي",
    welcomeBack: "مرحبًا بك في HireOps",
    loginSubtitle: "منصة عمليات التوظيف المؤسسية بالذكاء الاصطناعي",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    ssoLogin: "المتابعة عبر الدخول الموحد الحكومي",
    forgotPassword: "هل نسيت كلمة المرور؟",
    rememberMe: "تذكرني",
    dashboard: "لوحة القيادة",
    candidates: "المرشحون",
    jobs: "الوظائف",
    aiMatching: "المطابقة الذكية",
    cvParsing: "تحليل السيرة الذاتية",
    assessments: "التقييمات",
    aiInterviews: "المقابلات الذكية",
    reports: "التقارير",
    analytics: "التحليلات",
    settings: "الإعدادات",
    admin: "الإدارة",
    futureVision: "رؤية المستقبل",
    search: "ابحث عن مرشحين، وظائف، تقارير...",
    searchShort: "بحث...",
    notifications: "الإشعارات",
    aiOnline: "محرك الذكاء الاصطناعي متصل",
    signOut: "تسجيل الخروج",
    profile: "الملف الشخصي",
    adminConsole: "لوحة الإدارة",
    hrWorkspace: "مساحة الموارد البشرية",
    careerPortal: "بوابة المسار المهني",
    overview: "نظرة عامة",
    recruitment: "التوظيف",
    evaluation: "التقييم",
    insights: "الرؤى",
    system: "النظام",
    platform: "المنصة",
    aiGovernance: "حوكمة الذكاء الاصطناعي",
    operations: "العمليات",
    shortcuts: "اختصارات",
    home: "الرئيسية",
    support: "الدعم",
    browseJobs: "تصفح الوظائف",
    myApplications: "طلباتي",
    savedJobs: "الوظائف المحفوظة",
    myProfile: "ملفي الشخصي",
    resume: "السيرة الذاتية",
    documents: "المستندات",
    offers: "العروض",
    messages: "الرسائل",
    careerAssistant: "المساعد المهني",
    helpCenter: "مركز المساعدة",
    calendar: "التقويم",
    openHrWorkspace: "فتح مساحة الموارد البشرية",
    users: "المستخدمون",
    rolesPermissions: "الأدوار والصلاحيات",
    organization: "المؤسسة",
    aiConfiguration: "إعدادات الذكاء الاصطناعي",
    promptLibrary: "مكتبة الأوامر",
    usageAnalytics: "تحليلات الاستخدام",
    auditLogs: "سجلات التدقيق",
    systemHealth: "صحة النظام",
    featureFlags: "ميزات النظام",
    templates: "القوالب",
    language: "اللغة",
    markRead: "تعليم كمقروء",
    noNotifications: "لا توجد إشعارات جديدة",
    speaking: "يتحدث…",
    listen: "استماع",
    muteVoice: "كتم الصوت",
    unmuteVoice: "تفعيل الصوت",
    interviewer: "آمنة",
    interviewerRole: "المحاور الذكي",
  },
} as const;

export type DictKey = keyof typeof dictionary.en;

const NAV_LABEL_KEYS: Record<string, DictKey> = {
  "/hr/dashboard": "dashboard",
  "/hr/candidates": "candidates",
  "/hr/jobs": "jobs",
  "/hr/ai-matching": "aiMatching",
  "/hr/cv-parsing": "cvParsing",
  "/hr/assessments": "assessments",
  "/hr/ai-interview": "aiInterviews",
  "/hr/calendar": "calendar",
  "/hr/reports": "reports",
  "/hr/analytics": "analytics",
  "/hr/settings": "settings",
  "/hr/future-vision": "futureVision",
  "/admin": "dashboard",
  "/admin/users": "users",
  "/admin/roles": "rolesPermissions",
  "/admin/organization": "organization",
  "/admin/ai": "aiConfiguration",
  "/admin/prompts": "promptLibrary",
  "/admin/ai-usage": "usageAnalytics",
  "/admin/audit": "auditLogs",
  "/admin/health": "systemHealth",
  "/admin/features": "featureFlags",
  "/admin/templates": "templates",
  "/candidate": "dashboard",
  "/candidate/jobs": "browseJobs",
  "/candidate/applications": "myApplications",
  "/candidate/saved": "savedJobs",
  "/candidate/profile": "myProfile",
  "/candidate/resume": "resume",
  "/candidate/documents": "documents",
  "/candidate/assessments": "assessments",
  "/candidate/interviews": "aiInterviews",
  "/candidate/offers": "offers",
  "/candidate/messages": "messages",
  "/candidate/notifications": "notifications",
  "/candidate/assistant": "careerAssistant",
  "/candidate/help": "helpCenter",
  "/candidate/settings": "settings",
};

const GROUP_TITLE_KEYS: Record<string, DictKey> = {
  Overview: "overview",
  Recruitment: "recruitment",
  Evaluation: "evaluation",
  Insights: "insights",
  System: "system",
  Platform: "platform",
  "AI Governance": "aiGovernance",
  Operations: "operations",
  Shortcuts: "shortcuts",
  Home: "home",
  Profile: "profile",
  Support: "support",
};

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: DictKey) => string;
  dir: "ltr" | "rtl";
  navLabel: (href: string, fallback: string) => string;
  groupTitle: (title: string) => string;
};

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "hireops-lang";

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ar" || stored === "en") return stored;
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];
  if (cookie === "ar" || cookie === "en") return cookie;
  return "en";
}

function persistLang(l: Lang) {
  localStorage.setItem(STORAGE_KEY, l);
  document.cookie = `${STORAGE_KEY}=${l};path=/;max-age=31536000;SameSite=Lax`;
}

function applyDocumentLang(l: Lang) {
  const dir = l === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = l;
  document.documentElement.dir = dir;
  document.documentElement.classList.toggle("rtl", l === "ar");
  document.body?.setAttribute("dir", dir);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readStoredLang();
    setLangState(initial);
    applyDocumentLang(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyDocumentLang(lang);
  }, [lang, ready]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persistLang(l);
    applyDocumentLang(l);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === "en" ? "ar" : "en";
      persistLang(next);
      applyDocumentLang(next);
      return next;
    });
  }, []);

  const t = useCallback((key: DictKey) => dictionary[lang][key] ?? dictionary.en[key] ?? key, [lang]);

  const navLabel = useCallback(
    (href: string, fallback: string) => {
      const key = NAV_LABEL_KEYS[href];
      return key ? t(key) : fallback;
    },
    [t]
  );

  const groupTitle = useCallback(
    (title: string) => {
      const key = GROUP_TITLE_KEYS[title];
      return key ? t(key) : title;
    },
    [t]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl",
      navLabel,
      groupTitle,
    }),
    [lang, setLang, toggleLang, t, navLabel, groupTitle]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

const defaultLangValue: LangContextValue = {
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => dictionary.en[key] ?? key,
  dir: "ltr",
  navLabel: (_href, fallback) => fallback,
  groupTitle: (title) => title,
};

export function useLang() {
  const ctx = useContext(LangContext);
  // Soft fallback avoids recoverable SSR/HMR crashes when the provider
  // boundary is momentarily missing (Turbopack refresh / streaming).
  return ctx ?? defaultLangValue;
}
