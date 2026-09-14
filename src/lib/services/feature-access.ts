import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/helpers';
export async function requireFeature(organizationId: string | null, key: 'ai_interview'|'semantic_matching'|'career_assistant') {
  if(!organizationId) throw new ApiError(403,'No organization assigned');
  const {data,error}=await createAdminSupabaseClient().from('feature_flags').select('enabled').eq('organization_id',organizationId).eq('key',key).maybeSingle();
  if(error) throw error;
  if(data?.enabled===false) throw new ApiError(403,'This feature is disabled by your administrator');
}
