-- Migration 026: Add reference_code to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reference_code text UNIQUE;