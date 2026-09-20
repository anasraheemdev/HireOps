-- Migration: 023_candidate_applications_unique.sql
-- Enforce unique constraint on candidate_id and job_id in applications table if not existing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_candidate_job'
  ) THEN
    ALTER TABLE public.applications
    ADD CONSTRAINT unique_candidate_job UNIQUE (candidate_id, job_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
