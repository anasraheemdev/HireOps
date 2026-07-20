import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import {
  listMyDocuments,
  requireCandidateId,
} from "@/lib/services/candidate-portal.service";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    const { candidateId } = await requireCandidateId(profile);
    const data = await listMyDocuments(supabase, candidateId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId, organizationId } = await requireCandidateId(profile);
    const form = await request.formData();
    const file = form.get("file");
    const label = String(form.get("label") ?? "Document");
    if (!(file instanceof File)) throw new ApiError(400, "file required");

    const ext = file.name.split(".").pop() || "bin";
    const path = `${organizationId}/${candidateId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from("documents").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from("candidate_documents")
      .insert({
        organization_id: organizationId,
        candidate_id: candidateId,
        label,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
