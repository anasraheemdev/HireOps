import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { requireCandidateId } from "@/lib/services/candidate-portal.service";

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId, organizationId } = await requireCandidateId(profile);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "file required");

    const ext = file.name.split(".").pop() || "pdf";
    const path = `${organizationId}/${candidateId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, buffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from("candidates")
      .update({
        resume_file_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId)
      .select("id, resume_file_path, full_name")
      .single();
    if (error) throw error;

    await supabase.from("candidate_documents").insert({
      organization_id: organizationId,
      candidate_id: candidateId,
      label: "Resume",
      file_path: path,
      mime_type: file.type || "application/pdf",
      size_bytes: file.size,
      uploaded_by: user.id,
    });

    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}
