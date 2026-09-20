import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { requireCandidateId } from "@/lib/services/candidate-portal.service";
import { parseResumeBuffer } from "@/lib/services/resume-parse.service";
import { isSupportedResumeMime } from "@/lib/ai/extract-text";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId, organizationId } = await requireCandidateId(profile);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) throw new ApiError(400, "Missing upload parameter 'file'.");
    if (!file.size) throw new ApiError(400, "Empty document uploaded. Select a valid PDF or DOCX file.");
    if (file.size > 10 * 1024 * 1024) throw new ApiError(400, "File exceeds 10MB limit. Upload a smaller PDF or DOCX.");

    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name || "resume.pdf";
    if (!isSupportedResumeMime(mimeType, fileName)) {
      throw new ApiError(400, `Unsupported file format (${fileName}). Upload a valid PDF or DOCX file.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = await parseResumeBuffer(buffer, mimeType, fileName);

    const ext = fileName.split(".").pop() || "pdf";
    const privatePath = `${organizationId}/${candidateId}/draft_${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("resumes").upload(privatePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (upErr) {
      console.warn("[Candidate Resume API] Storage upload warning:", upErr.message);
    }

    try {
      await supabase.from("candidate_documents").insert({
        organization_id: organizationId,
        candidate_id: candidateId,
        label: `Draft Resume (${fileName})`,
        file_path: privatePath,
        mime_type: mimeType,
        size_bytes: file.size,
        uploaded_by: user.id,
      });
    } catch {
      // document record insert is optional
    }

    return NextResponse.json({
      data: {
        parsed: parseResult.parsed,
        confidence: parseResult.confidence,
        warnings: parseResult.warnings,
        resumeText: parseResult.resumeText,
        resumeFilePath: privatePath,
        fileName,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
