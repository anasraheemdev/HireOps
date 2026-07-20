/** HireOps brand constants — single source of truth for product identity. */
export const BRAND = {
  name: "HireOps",
  shortName: "HireOps",
  tagline: "AI Recruitment Operations Platform",
  windowTitle: "HireOps – AI Recruitment Operations Platform",
  metaTitle: "HireOps | Enterprise AI Recruitment Platform",
  metaDescription:
    "HireOps is an enterprise AI Recruitment Operations Platform that automates resume screening, candidate matching, AI interviews, assessments, recruitment analytics, and hiring workflows.",
  copyright: "© 2026 HireOps",
  copyrightFull: "© 2026 HireOps. Enterprise AI Recruitment Operations Platform. All Rights Reserved.",
  themeColor: "#0a0e16",
  accent: "#007BFF",
  logoSrc: "/HireOps.png",
  logoMarkSrc: "/logo.png",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://hireops.app",
  openRouterTitle: "HireOps",
  openRouterReferer: process.env.NEXT_PUBLIC_APP_URL || "https://hireops.app",
} as const;

export type Brand = typeof BRAND;
