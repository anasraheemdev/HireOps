import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { addInternalNote, listInternalNotes } from "@/lib/services/enterprise.service";

export async function GET(request: Request) {
  try {
    const { supabase } = await requirePermission("notes.write", "candidates.read");
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    if (!entityType || !entityId) throw new ApiError(400, "entityType and entityId required");
    const data = await listInternalNotes(supabase, entityType, entityId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("notes.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization");
    const body = z
      .object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        body: z.string().min(1),
      })
      .parse(await request.json());
    const data = await addInternalNote(supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
