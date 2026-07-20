import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listRolesWithPermissions } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.roles.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await listRolesWithPermissions(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
