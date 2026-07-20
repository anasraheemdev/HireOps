import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { updateUser, updateUserSchema } from "@/lib/services/admin.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, profile } = await requirePermission("portal.admin", "admin.users.manage");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const body = updateUserSchema.parse(await request.json());
    const data = await updateUser(profile.organizationId, user.id, id, body);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
