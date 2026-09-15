import { NextResponse } from "next/server";
import { requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { requireCandidateId, createNotification } from "@/lib/services/candidate-portal.service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseResumeBuffer } from "@/lib/services/resume-parse.service";
import { isSupportedResumeMime } from "@/lib/ai/extract-text";
import { autoAssignAssessmentToApplication } from "@/lib/services/assessment-generator.service";
import { explainMatch } from "@/lib/services/matching.service";
import { embedAndStoreCandidate, buildCandidateEmbeddingText } from "@/lib/services/embeddings.service";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireProfile();
    const { candidateId, organizationId } = await requireCandidateId(profile);
    const admin = createAdminSupabaseClient();

    let jobId = "";
    let file: File | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      jobId = (form.get("jobId") as string) || "";
      const formFile = form.get("file");
      if (formFile instanceof File && formFile.size > 0) {
        file = formFile;
      }
    } else {
      const body = await request.json();
      jobId = body.jobId || "";
    }

    if (!jobId) throw new ApiError(400, "Job ID is required");

    // 1. Check job availability
    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job || job.status !== "open") {
      throw new ApiError(400, "This job is not currently accepting applications.");
    }

    // 2. Check existing application
    const { data: existingApp } = await admin
      .from("applications")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .maybeSingle();

    if (existingApp) {
      return NextResponse.json({
        data: { ...existingApp, alreadyApplied: true },
        message: "You have already applied for this role.",
      });
    }

    // 3. Process CV upload if provided
    let resumePath: string | null = null;
    let parsedResumeText: string | null = null;

    if (file) {
      if (!isSupportedResumeMime(file.type, file.name) || file.size > 10 * 1024 * 1024) {
        throw new ApiError(400, "Invalid resume file. Upload a PDF or DOCX up to 10MB.");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${organizationId}/${candidateId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, buffer, { contentType: file.type || "application/pdf", upsert: true });

      if (!upErr) {
        resumePath = path;
        try {
          const parsed = await parseResumeBuffer(buffer, file.type || "application/pdf", file.name);
          parsedResumeText = parsed.resumeText;

          // Update candidate details with parsed resume data
          await admin.from("candidates").update({
            headline: parsed.parsed.headline || job.title,
            phone: parsed.parsed.phone || null,
            location: parsed.parsed.location || null,
            experience_years: parsed.parsed.experienceYears || 0,
            resume_file_path: path,
            resume_text: parsed.resumeText,
            updated_at: new Date().toISOString(),
          }).eq("id", candidateId);

          if (parsed.parsed.skills?.length) {
            await admin.from("candidate_skills").delete().eq("candidate_id", candidateId);
            await admin.from("candidate_skills").insert(
              parsed.parsed.skills.map((s) => ({ candidate_id: candidateId, skill: s }))
            );
          }
        } catch (parseErr) {
          console.warn("Resume auto-parse warning:", parseErr);
        }
      }
    }

    // 4. Create Application record
    const { data: newApp, error: appErr } = await admin
      .from("applications")
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        stage: "applied",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (appErr || !newApp) throw appErr || new Error("Failed to create application");

    // 5. Update Candidate Embedding & Run AI Match Scoring
    try {
      const { data: cand } = await admin
        .from("candidates")
        .select("*, candidate_skills(skill)")
        .eq("id", candidateId)
        .single();

      if (cand) {
        const skillsList = (cand.candidate_skills || []).map((s: { skill: string }) => s.skill);
        const embedText = buildCandidateEmbeddingText({
          fullName: cand.full_name,
          headline: cand.headline,
          experienceYears: cand.experience_years,
          skills: skillsList,
          resumeText: parsedResumeText || cand.resume_text,
        });
        await embedAndStoreCandidate(admin, candidateId, embedText);
        await explainMatch(admin, jobId, candidateId).catch((e) => console.warn("Match explanation:", e));
      }
    } catch (matchErr) {
      console.warn("Match scoring warning:", matchErr);
    }

    // 6. Auto-generate or Assign Assessment Exam for Candidate
    let assignedAssessment = null;
    try {
      assignedAssessment = await autoAssignAssessmentToApplication(
        supabase,
        organizationId,
        newApp.id,
        jobId
      );
    } catch (assessErr) {
      console.warn("Auto assessment assign error:", assessErr);
    }

    // 7. Auto-create AI Interview Session for Candidate
    try {
      const { data: existingSession } = await admin
        .from("interview_sessions")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .maybeSingle();

      if (!existingSession) {
        await admin.from("interview_sessions").insert({
          organization_id: organizationId,
          application_id: newApp.id,
          candidate_id: candidateId,
          job_id: jobId,
          mode: "behavioral",
          status: "scheduled",
          scheduled_at: new Date().toISOString(),
        });
      }
    } catch (interviewErr) {
      console.warn("Auto interview schedule error:", interviewErr);
    }

    // 8. Create Notification for Candidate
    await createNotification(supabase, {
      recipientId: user.id,
      type: "application",
      title: `Applied to ${job.title}`,
      body: `Your application has been received. Check your Assessments and AI Interviews tabs to complete your evaluation steps.`,
      metadata: { applicationId: newApp.id, jobId },
    }).catch(() => null);

    return NextResponse.json({
      data: {
        applicationId: newApp.id,
        jobTitle: job.title,
        stage: newApp.stage,
        assessment: assignedAssessment ? { title: assignedAssessment.assessmentTitle } : null,
      },
    }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
