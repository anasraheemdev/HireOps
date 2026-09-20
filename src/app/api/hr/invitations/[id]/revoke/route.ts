import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { revokeInvitation } from "@/lib/services/invitation.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const invitationId = z.string().uuid("Invalid invitation ID").parse(rawId);
    const ctx = await requirePermission("candidates.edit");

    if (ctx.profile.portalRole !== "hr" && ctx.profile.portalRole !== "super_admin") {
      throw new ApiError(403, "Only HR or Super Admin can revoke candidate invitations");
    }

    const data = await revokeInvitation(ctx.profile.organizationId!, ctx.profile.id, invitationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
