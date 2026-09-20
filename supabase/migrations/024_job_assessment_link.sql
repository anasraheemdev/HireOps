-- Migration: 024_job_assessment_link.sql
-- Add assessment_id column to jobs table to link active assessment templates directly to jobs

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'assessment_id'
  ) THEN
    ALTER TABLE public.jobs
    ADD COLUMN assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL;
  END IF;
END $$;