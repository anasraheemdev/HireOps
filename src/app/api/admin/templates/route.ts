import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { listInterviewTemplates, createInterviewTemplate, createInterviewTemplateSchema } from "@/lib/services/admin.service";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.ai.prompts");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const data = await listInterviewTemplates(supabase, profile.organizationId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requirePermission("portal.admin", "admin.ai.prompts");
    if (!profile.organizationId) throw new ApiError(400, "No organization assigned to your profile");
    const body = createInterviewTemplateSchema.parse(await request.json());
    const data = await createInterviewTemplate(supabase, profile.organizationId, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
