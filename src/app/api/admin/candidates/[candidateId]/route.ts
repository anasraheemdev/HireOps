import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import {
  deleteCandidatePermanently,
  deleteCandidateSchema,
} from "@/lib/services/admin.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const { user, profile } = await requirePermission("portal.admin", "admin.users.manage");

    if (profile.portalRole !== "super_admin") {
      throw new ApiError(403, "Only Super Admin accounts can permanently delete candidate users");
    }

    const json = await request.json().catch(() => ({}));
    const body = deleteCandidateSchema.parse(json);

    const result = await deleteCandidatePermanently(candidateId, { ...profile, email: user.email ?? profile.email }, body);
    return NextResponse.json({ data: result });
  } catch (err) {
    return jsonError(err);
  }
}
