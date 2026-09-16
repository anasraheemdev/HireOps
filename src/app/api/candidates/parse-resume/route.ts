import { NextResponse } from "next/server";
import { requirePermission, jsonError, ApiError } from "@/lib/api/helpers";
import { parseResumeBuffer } from "@/lib/services/resume-parse.service";
import { isSupportedResumeMime } from "@/lib/ai/extract-text";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requirePermission("candidates.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization assigned to your profile");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Missing file upload");
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      throw new ApiError(400, "Upload a non-empty PDF, DOCX, or TXT file up to 10 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name || "resume.pdf";

    if (!isSupportedResumeMime(mimeType, fileName)) {
      throw new ApiError(400, `Unsupported file format (${fileName}). Upload PDF, DOCX, or TXT.`);
    }

    const tmpId = crypto.randomUUID();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.organizationId}/tmp/${tmpId}/${safeName}`;

    const result = await parseResumeBuffer(buffer, mimeType, fileName);

    let finalStoragePath: string | null = storagePath;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) {
      console.warn("[parse-resume] Storage upload warning (non-fatal):", uploadError.message);
      finalStoragePath = null;
    }

    return NextResponse.json({
      data: {
        ...result.parsed,
        confidence: result.confidence,
        warnings: result.warnings,
        resumeText: result.resumeText,
        resumeFilePath: finalStoragePath,
        fileName,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
