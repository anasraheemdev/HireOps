import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { portalHome, legacyRedirects } from "@/lib/nav";
import type { PortalRole } from "@/lib/auth/types";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/auth-code-error",
  "/candidate/signup",
  "/candidate-signup",
];

function mapPortal(roleName: string | null | undefined, portalRole: string | null | undefined): PortalRole {
  if (portalRole === "super_admin" || portalRole === "hr" || portalRole === "candidate") {
    return portalRole;
  }
  if (roleName === "Super Admin") return "super_admin";
  if (roleName === "Candidate") return "candidate";
  return "hr";
}

/**
 * Refreshes the Supabase auth session, enforces portal boundaries, and
 * redirects legacy flat URLs to /hr/* paths.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && !isPublic && pathname !== "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Legacy flat routes → /hr/*
  const legacyTarget = legacyRedirects[pathname];
  if (user && legacyTarget && pathname !== legacyTarget && !pathname.startsWith("/hr/") && !pathname.startsWith("/admin") && !pathname.startsWith("/candidate")) {
    // Only redirect exact legacy roots that aren't already under portals
    if (["/dashboard", "/candidates", "/jobs", "/ai-matching", "/cv-parsing", "/assessments", "/ai-interview", "/reports", "/analytics", "/settings", "/future-vision"].includes(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = legacyTarget;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Candidate detail legacy
  if (user && pathname.startsWith("/candidates/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace("/candidates/", "/hr/candidates/");
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("portal_role, roles ( name )")
      .eq("id", user.id)
      .maybeSingle();
    const role = Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles;
    const portal = mapPortal(role?.name, profile?.portal_role as string | null);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = portalHome[portal];
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("portal_role, roles ( name )")
      .eq("id", user.id)
      .maybeSingle();
    const role = Array.isArray(profile?.roles) ? profile?.roles[0] : profile?.roles;
    const portal = mapPortal(role?.name, profile?.portal_role as string | null);

    const onAdmin = pathname.startsWith("/admin");
    const onHr = pathname.startsWith("/hr");
    const onCandidate = pathname.startsWith("/candidate");

    if (onAdmin && portal !== "super_admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = portalHome[portal];
      return NextResponse.redirect(redirectUrl);
    }
    if (onCandidate && portal !== "candidate" && portal !== "super_admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = portalHome[portal];
      return NextResponse.redirect(redirectUrl);
    }
    if (onHr && portal === "candidate") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = portalHome.candidate;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
