import { NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/assessment-schema";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { listAssessmentsRaw } from "@/lib/services/enterprise.service";
import { listMyAssessmentAssignments, requireCandidateId } from "@/lib/services/candidate-portal.service";

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1" || profile.portalRole === "candidate";

    if (mine) {
      const { candidateId } = await requireCandidateId(profile);
      const data = await listMyAssessmentAssignments(supabase, candidateId);
      return NextResponse.json({ data });
    }

    await requirePermission("assessments.read");
    const data = await listAssessmentsRaw(supabase);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("assessments.write");
    if (!profile.organizationId) throw new ApiError(403, "No organization");
    const body = assessmentSchema.parse(await request.json());
    const { data, error } = await supabase.from('assessments').insert({ organization_id: profile.organizationId, created_by: user.id, title: body.title, description: body.description, difficulty: body.difficulty, duration_minutes: body.durationMinutes, status: 'draft', question_count: body.questions.length }).select('*').single();
    if (error) throw error;
    const { error: questionError } = await supabase.from('assessment_questions').insert(body.questions.map((q, i) => ({ assessment_id: data.id, prompt: q.prompt, question_type: q.questionType, options: q.options, correct_answer: q.correctAnswer, points: q.points, sort_order: i })));
    if (questionError) { await supabase.from('assessments').delete().eq('id', data.id); throw questionError; }
    const { error: activateError } = await supabase.from('assessments').update({status: 'active'}).eq('id', data.id);
    if (activateError) throw activateError;
    data.status = 'active';
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
