import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listAuditLogs } from "@/lib/services/admin.service";

export async function GET(request: Request) {
  try {
    const { profile } = await requirePermission("portal.admin", "audit.read");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
    const data = await listAuditLogs(profile.organizationId, limit);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
