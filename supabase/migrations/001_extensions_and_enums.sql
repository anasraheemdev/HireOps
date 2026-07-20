-- ============================================================================
-- 001: Extensions & Enums
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy text search on names/titles
create extension if not exists "vector";         -- pgvector, used from Phase 2 (embeddings) onward

-- Pipeline stage a candidate application moves through
do $$ begin
  create type application_stage as enum (
    'applied',
    'screening',
    'assessment',
    'ai_interview',
    'final_interview',
    'offer',
    'hired',
    'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('open', 'closed', 'draft', 'on_hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_type as enum ('full_time', 'part_time', 'contract');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_priority as enum ('critical', 'high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type language_level as enum ('native', 'fluent', 'professional', 'conversational', 'basic');
exception when duplicate_object then null; end $$;
