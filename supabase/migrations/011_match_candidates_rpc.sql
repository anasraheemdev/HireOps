-- ============================================================================
-- 011: Semantic match RPC — cosine similarity via pgvector
-- ============================================================================

create or replace function match_candidates_for_job(
  p_job_id uuid,
  p_limit integer default 50
)
returns table (
  candidate_id uuid,
  similarity double precision
)
language sql
stable
security invoker
as $$
  select
    c.id as candidate_id,
    (1 - (c.embedding <=> j.embedding))::double precision as similarity
  from jobs j
  join candidates c
    on c.organization_id = j.organization_id
   and c.embedding is not null
  where j.id = p_job_id
    and j.embedding is not null
  order by c.embedding <=> j.embedding
  limit greatest(p_limit, 1);
$$;

grant execute on function match_candidates_for_job(uuid, integer) to authenticated;
grant execute on function match_candidates_for_job(uuid, integer) to service_role;

comment on function match_candidates_for_job is
  'Returns candidates ranked by cosine similarity to the given job embedding. Scores are in [0,1] where 1 is identical.';
