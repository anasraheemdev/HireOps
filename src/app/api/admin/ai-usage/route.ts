import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getAiUsageSummary } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.system.monitor", "admin.ai.configure");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await getAiUsageSummary(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
