import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listFeatureFlags, upsertFeatureFlag, upsertFeatureFlagSchema } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.feature_flags");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await listFeatureFlags(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("portal.admin", "admin.feature_flags");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const body = upsertFeatureFlagSchema.parse(await request.json());
    const data = await upsertFeatureFlag(supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
