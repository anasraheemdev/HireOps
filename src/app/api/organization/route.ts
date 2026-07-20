import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getOrganization, updateOrganization, updateOrganizationSchema } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.hr", "portal.admin", "admin.org.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned");
    const data = await getOrganization(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, profile } = await requirePermission("portal.hr", "portal.admin", "admin.org.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned");
    const body = updateOrganizationSchema.parse(await request.json());
    const data = await updateOrganization(profile.organizationId, user.id, body);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
