import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthProfile } from "@/lib/auth/get-profile";
import type { AuthProfile } from "@/lib/auth/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");
  return { supabase, user };
}

export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const profile = await getAuthProfile(supabase, user.id);
  if (!profile) throw new ApiError(403, "Profile not found");
  if (profile.status !== "active") throw new ApiError(403, "Your account is not active. Contact your administrator.");
  return { supabase, user, profile };
}

export function profileHasPermission(profile: AuthProfile, code: string) {
  if (profile.status !== "active") return false;
  if (profile.portalRole === "super_admin" || profile.permissions.includes("portal.admin")) return true;
  return profile.permissions.includes(code);
}

export async function requirePermission(...codes: string[]) {
  const ctx = await requireProfile();
  const ok = codes.some((c) => profileHasPermission(ctx.profile, c));
  if (!ok) throw new ApiError(403, "Insufficient permissions");
  return ctx;
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ZodError") {
    const issues = (err as { issues?: { message?: string }[] }).issues;
    return NextResponse.json(
      { error: issues?.[0]?.message ?? "Invalid request payload" },
      { status: 400 }
    );
  }
  console.error("[API Error]", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
