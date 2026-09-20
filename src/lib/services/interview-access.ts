import { requireFeature } from './feature-access';
import 'server-only';
import { z } from 'zod';
import { requirePermission, ApiError } from '@/lib/api/helpers';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
export async function interviewAccess(rawId: string, write = false) {
  const id = z.string().uuid().parse(rawId);
  const ctx = await requirePermission(...(write ? ['interviews.conduct','interviews.write'] : ['interviews.read','interviews.conduct']));
  const { data: session, error } = await ctx.supabase.from('interview_sessions').select('*').eq('id',id).eq('organization_id',ctx.profile.organizationId!).single();
  if (error || !session) throw new ApiError(404,'Interview not found');
  if (ctx.profile.portalRole==='candidate' && session.candidate_id!==ctx.profile.candidateId) throw new ApiError(403,'This interview is assigned to another candidate');
  if (write) await requireFeature(ctx.profile.organizationId,'ai_interview');

  // Atomically transition scheduled -> in_progress when accessed
  if (session.status === 'scheduled') {
    const adminDb = createAdminSupabaseClient();
    const { data: updated, error: updateErr } = await adminDb
      .from('interview_sessions')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'scheduled')
      .select('*')
      .single();

    if (!updateErr && updated) {
      session.status = 'in_progress';
      session.started_at = updated.started_at;
    }
  }

  if (write && session.status !== 'in_progress') {
    if (session.status === 'completed') throw new ApiError(409, 'This interview is already completed');
    if (session.status === 'cancelled') throw new ApiError(409, 'This interview was cancelled');
    throw new ApiError(409, 'This interview is not in progress');
  }
  return { ...ctx, id, session, supabase: ctx.profile.portalRole==='candidate' ? createAdminSupabaseClient() : ctx.supabase };
}

