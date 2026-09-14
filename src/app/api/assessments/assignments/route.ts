import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, jsonError, ApiError } from '@/lib/api/helpers';
export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requirePermission('assessments.launch');
    const body = z.object({ assessmentId: z.string().uuid(), applicationId: z.string().uuid() }).parse(await request.json());
    const { data: assessment } = await supabase.from('assessments').select('id, question_count, status').eq('id',body.assessmentId).eq('organization_id',profile.organizationId!).single();
    if (!assessment || assessment.status !== 'active' || !assessment.question_count) throw new ApiError(400,'Select an active assessment with questions');
    const { data: app } = await supabase.from('applications').select('id').eq('id',body.applicationId).single();
    if (!app) throw new ApiError(404,'Application not found');
    const { data, error } = await supabase.from('assessment_assignments').insert({ assessment_id:body.assessmentId, application_id:body.applicationId }).select('*').single();
    if (error?.code === '23505') throw new ApiError(409,'This assessment is already assigned to the candidate');
    if (error) throw error;
    return NextResponse.json({ data }, {status:201});
  } catch(error) { return jsonError(error); }
}
