"use client";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/fetcher';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/shared/score-ring';
import type { Candidate } from '@/lib/types';
import type { combineEvidence } from '@/lib/scoring';
import { toast } from 'sonner';

type Evaluation = ReturnType<typeof combineEvidence> & { assessmentCount: number; interviewCount: number; matchReasoning: { reasoning?: string[]; matchedSkills?: string[]; missingSkills?: string[] } | null };
export function CandidateScoringPanel({ candidate }: { candidate: Candidate }) {
  const qc = useQueryClient();
  const url = `/api/applications/${candidate.applicationId}/evaluation`;
  const query = useQuery({ queryKey: ['evaluation', candidate.applicationId], queryFn: () => apiFetch<Evaluation>(url), enabled: !!candidate.applicationId });
  const refresh = useMutation({ mutationFn: () => apiFetch(url, { method: 'POST' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluation'] }); qc.invalidateQueries({ queryKey: ['candidates'] }); }, onError: (e: Error) => toast.error(e.message) });
  if (!candidate.applicationId) return <p className="glass-card p-5">Link this candidate to a job before evaluating fit.</p>;
  if (query.isLoading) return <p className="glass-card p-5">Loading evaluation evidence…</p>;
  if (query.isError) return <div className="glass-card p-5">{query.error.message}<Button onClick={() => query.refetch()}>Retry</Button></div>;
  const data = query.data;
  if (!data) return null;
  return <div className="space-y-4">
    <div className="glass-card p-6 flex flex-wrap gap-6 items-center">
      {data.overall !== null ? <ScoreRing score={data.overall} size={130} sublabel="Evidence score" /> : <strong>Not evaluated</strong>}
      <div className="flex-1 space-y-3"><h3 className="font-semibold">{data.recommendation}</h3>
        <p className="text-sm text-muted-foreground">Job match 40%, assessments 30%, interviews 30%. Missing evidence is excluded and available weights are rescaled. This is a decision aid; HR makes the final decision.</p>
        <Button disabled={refresh.isPending} onClick={() => refresh.mutate()}>{refresh.isPending ? 'Evaluating job fit…' : 'Evaluate job fit'}</Button>
      </div>
    </div>
    <div className="grid sm:grid-cols-3 gap-3">{data.evidence.map(e => <div key={e.label} className="glass-card p-5"><p className="text-sm text-muted-foreground">{e.label}</p><p className="text-2xl mt-2">{e.score === null ? 'Pending' : `${e.score.toFixed(1)}%`}</p></div>)}</div>
    <div className="glass-card p-5 space-y-3"><h3 className="font-semibold">Evidence and gaps</h3><p className="text-sm">{data.assessmentCount} completed assessment(s) · {data.interviewCount} completed interview(s)</p>
      {data.matchReasoning?.reasoning?.map((reason, i) => <p key={i} className="text-sm text-muted-foreground">{reason}</p>)}
      {data.matchReasoning && <><p className="text-sm">Matched skills: {data.matchReasoning.matchedSkills?.join(', ') || 'None recorded'}</p><p className="text-sm">Skill gaps: {data.matchReasoning.missingSkills?.join(', ') || 'None recorded'}</p></>}
    </div>
  </div>;
}
