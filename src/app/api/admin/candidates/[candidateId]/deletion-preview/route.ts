import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { getCandidateDeletionPreview } from "@/lib/services/admin.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const { profile } = await requirePermission("portal.admin", "admin.users.manage");

    if (profile.portalRole !== "super_admin") {
      throw new ApiError(403, "Only Super Admin accounts can access candidate deletion preview");
    }

    const preview = await getCandidateDeletionPreview(candidateId, profile);
    return NextResponse.json({ data: preview });
  } catch (err) {
    return jsonError(err);
  }
}
