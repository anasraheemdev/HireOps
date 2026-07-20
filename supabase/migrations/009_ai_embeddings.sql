-- ============================================================================
-- 009: AI embeddings — semantic matching support (pgvector)
-- ============================================================================

alter table candidates add column if not exists embedding vector(1536);
alter table candidates add column if not exists resume_text text;
alter table candidates add column if not exists embedding_updated_at timestamptz;

alter table jobs add column if not exists embedding vector(1536);
alter table jobs add column if not exists embedding_updated_at timestamptz;

alter table applications add column if not exists match_reasoning jsonb;

-- Cosine-distance ANN indexes. HNSW needs no ANALYZE/list-count tuning and
-- performs well even on small seeded datasets.
create index if not exists idx_candidates_embedding on candidates
  using hnsw (embedding vector_cosine_ops);

create index if not exists idx_jobs_embedding on jobs
  using hnsw (embedding vector_cosine_ops);

comment on column candidates.embedding is 'Semantic embedding of the candidate profile (headline + skills + experience summary), used for cosine-similarity matching against job.embedding.';
comment on column jobs.embedding is 'Semantic embedding of the job requirements (title + description + required skills), used for cosine-similarity matching against candidates.embedding.';
comment on column applications.match_reasoning is 'Structured AI explanation: {matchedSkills, missingSkills, scoreBreakdown, reasoning[]} generated on demand when a recruiter views match details.';
