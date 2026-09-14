import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listSecrets, upsertSecret, upsertSecretSchema } from "@/lib/services/admin.service";

/** Server-only encrypted organization AI settings. */
export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.ai.configure");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await listSecrets(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("portal.admin", "admin.ai.configure");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const body = upsertSecretSchema.parse(await request.json());
    const data = await upsertSecret(supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
