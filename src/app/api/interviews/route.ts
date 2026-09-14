import { requireFeature } from '@/lib/services/feature-access';
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile, jsonError, ApiError } from "@/lib/api/helpers";
import { listInterviewSessions, createInterviewSession } from "@/lib/services/enterprise.service";
import { listMyInterviews, requireCandidateId } from "@/lib/services/candidate-portal.service";
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { supabase, profile } = await requireProfile();
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1" || profile.portalRole === "candidate";

    if (mine) {
      const { candidateId } = await requireCandidateId(profile);
      const data = await listMyInterviews(supabase, candidateId);
      return NextResponse.json({ data });
    }

    await requirePermission("interviews.read", "interviews.conduct");
    const data = await listInterviewSessions(supabase);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requirePermission("interviews.write", "interviews.conduct");
    if (!profile.organizationId) throw new ApiError(403, "No organization");
    const body = z
      .object({
        candidateId: z.string().uuid(),
        jobId: z.string().uuid().optional(),
        applicationId: z.string().uuid().optional(),
        mode: z.enum(['behavioral','technical','mixed','leadership']).optional(),
        templateId: z.string().uuid().optional(),
      })
      .parse(await request.json());
    await requireFeature(profile.organizationId, 'ai_interview');
    if (profile.portalRole==='candidate' && body.candidateId!==profile.candidateId) throw new ApiError(403,'You can only start your own interview');
    const {data:candidate}=await supabase.from('candidates').select('id').eq('id',body.candidateId).eq('organization_id',profile.organizationId).single();
    if(!candidate) throw new ApiError(404,'Candidate not found');
    if(body.applicationId){
      const {data:app}=await supabase.from('applications').select('candidate_id,job_id').eq('id',body.applicationId).single();
      if(!app||app.candidate_id!==body.candidateId||(body.jobId&&body.jobId!==app.job_id)) throw new ApiError(400,'Application, candidate and job must match');
      body.jobId=app.job_id;
    } else if(body.jobId){
      const {data:job}=await supabase.from('jobs').select('id').eq('id',body.jobId).eq('organization_id',profile.organizationId).single();
      if(!job) throw new ApiError(404,'Job not found');
      const {data:app}=await supabase.from('applications').select('id').eq('candidate_id',body.candidateId).eq('job_id',body.jobId).maybeSingle();
      if(profile.portalRole==='candidate'&&!app) throw new ApiError(400,'Apply to the job before starting its interview');
      body.applicationId=app?.id;
    }
    if(body.templateId){
      const {data:template}=await supabase.from('interview_templates').select('id').eq('id',body.templateId).eq('organization_id',profile.organizationId).single();
      if(!template) throw new ApiError(404,'Template not found');
    }
    const data = await createInterviewSession(profile.portalRole==='candidate'?createAdminSupabaseClient():supabase, profile.organizationId, user.id, body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
