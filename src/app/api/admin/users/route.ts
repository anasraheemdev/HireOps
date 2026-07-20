import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listUsers, inviteUser, inviteUserSchema } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.users.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await listUsers(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await requirePermission("portal.admin", "admin.users.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const body = inviteUserSchema.parse(await request.json());
    const data = await inviteUser(profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
