import { requireFeature } from '@/lib/services/feature-access';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, jsonError, ApiError } from '@/lib/api/helpers';
import { combineEvidence } from '@/lib/scoring';
import { explainMatch } from '@/lib/services/matching.service';
type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase } = await requirePermission('candidates.read');
    const id = z.string().uuid().parse((await params).id);
    const { data: app, error } = await supabase.from('applications').select('*').eq('id', id).single();
    if (error || !app) throw new ApiError(404, 'Application not found');
    const [{ data: exams, error: examError }, { data: interviews, error: interviewError }] = await Promise.all([
      supabase.from('assessment_assignments').select('score').eq('application_id', id).eq('status', 'completed'),
      supabase.from('interview_sessions').select('scores').eq('application_id', id).eq('status', 'completed'),
    ]);
    if (examError) throw examError;
    if (interviewError) throw interviewError;
    const average = (values: number[]) => values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;
    const interviewScores = (interviews ?? []).flatMap(row => {
      const score = (row.scores as { overall?: unknown } | null)?.overall;
      return typeof score === 'number' && Number.isFinite(score) ? [score] : [];
    });
    const examScores = (exams ?? []).flatMap(row => row.score === null ? [] : [Number(row.score)]);
    const match = app.match_reasoning ? Number(app.match_score) : null;
    return NextResponse.json({ data: { ...combineEvidence(match, average(examScores), average(interviewScores)), matchReasoning: app.match_reasoning, assessmentCount: examScores.length, interviewCount: interviewScores.length } });
  } catch (error) { return jsonError(error); }
}
export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, profile } = await requirePermission('applications.write');
    await requireFeature(profile.organizationId,'semantic_matching');
    const id = z.string().uuid().parse((await params).id);
    const { data: app, error } = await supabase.from('applications').select('candidate_id, job_id').eq('id', id).single();
    if (error || !app) throw new ApiError(404, 'Application not found');
    return NextResponse.json({ data: await explainMatch(supabase, app.job_id, app.candidate_id) });
  } catch (error) { return jsonError(error); }
}
