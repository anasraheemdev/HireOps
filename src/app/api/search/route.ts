import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
    if (q.length < 2) throw new ApiError(400, "Query must be at least 2 characters");

    const { data, error } = await supabase.rpc("search_org_entities", {
      p_query: q,
      p_limit: limit,
    });
    if (error) {
      // Fallback ilike search if RPC unavailable
      const [cands, jobs] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, full_name, headline, email")
          .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,headline.ilike.%${q}%`)
          .limit(limit),
        supabase
          .from("jobs")
          .select("id, title, location")
          .ilike("title", `%${q}%`)
          .limit(limit),
      ]);
      const results = [
        ...(cands.data ?? []).map((c) => ({
          entity_type: "candidate",
          entity_id: c.id,
          title: c.full_name,
          subtitle: c.headline ?? c.email,
          rank: 0.5,
          href:
            profile.portalRole === "candidate"
              ? "/candidate"
              : `/hr/candidates/${c.id}`,
        })),
        ...(jobs.data ?? []).map((j) => ({
          entity_type: "job",
          entity_id: j.id,
          title: j.title,
          subtitle: j.location,
          rank: 0.5,
          href: profile.portalRole === "candidate" ? "/candidate/jobs" : "/hr/jobs",
        })),
      ];
      return NextResponse.json({ data: results });
    }

    const results = (Array.isArray(data) ? data : data ? [data] : []).map((row) => ({
      ...row,
      href:
        row.entity_type === "candidate"
          ? profile.portalRole === "candidate"
            ? "/candidate"
            : `/hr/candidates/${row.entity_id}`
          : profile.portalRole === "candidate"
            ? "/candidate/jobs"
            : "/hr/jobs",
    }));
    return NextResponse.json({ data: results });
  } catch (err) {
    return jsonError(err);
  }
}
