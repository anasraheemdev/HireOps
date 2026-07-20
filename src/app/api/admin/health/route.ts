import { NextResponse } from "next/server";
import { requirePermission, jsonError } from "@/lib/api/helpers";

export async function GET() {
  try {
    const { supabase } = await requirePermission("admin.system.monitor", "portal.admin");

    const [{ count: candidates }, { count: jobs }, { count: withEmbed }, { count: users }] = await Promise.all([
      supabase.from("candidates").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      (supabase as any).from("candidates").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

    const { data: byRole } = await (supabase as any).from("profiles").select("portal_role");
    const usersByPortalRole = { super_admin: 0, hr: 0, candidate: 0 } as Record<string, number>;
    for (const row of byRole ?? []) {
      const role = row.portal_role as string | null;
      if (role && role in usersByPortalRole) usersByPortalRole[role] += 1;
    }

    let usageToday = 0;
    try {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { count } = await (supabase as any)
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since.toISOString());
      usageToday = count ?? 0;
    } catch {
      usageToday = 0;
    }

    // Database ping — a lightweight real query against a small table.
    let database: "healthy" | "down" = "down";
    let dbLatencyMs: number | null = null;
    try {
      const start = Date.now();
      const { error } = await supabase.from("organizations").select("id", { head: true, count: "exact" }).limit(1);
      dbLatencyMs = Date.now() - start;
      database = error ? "down" : "healthy";
    } catch {
      database = "down";
    }

    // Storage ping — list the resumes bucket (RLS-scoped to the caller's org).
    let storage: "healthy" | "degraded" | "down" = "down";
    try {
      const { error } = await supabase.storage.from("resumes").list("", { limit: 1 });
      storage = error ? "degraded" : "healthy";
    } catch {
      storage = "down";
    }

    // Auth ping — resolve the current session via Supabase Auth.
    let auth: "healthy" | "down" = "down";
    try {
      const { data: authData, error } = await supabase.auth.getUser();
      auth = authData?.user && !error ? "healthy" : "down";
    } catch {
      auth = "down";
    }

    return NextResponse.json({
      data: {
        candidates: candidates ?? 0,
        jobs: jobs ?? 0,
        users: users ?? 0,
        usersByPortalRole,
        embeddingCoverage: candidates ? Math.round(((withEmbed ?? 0) / candidates) * 100) : 0,
        aiRequestsToday: usageToday,
        database,
        dbLatencyMs,
        storage,
        auth,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
