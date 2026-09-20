-- ============================================================================
-- 025: Extended Application Stages, Candidate Invitations, HR Audit & RBAC Safeguards
-- ============================================================================

-- 1. Extend application_stage enum to include granular hiring workflow stages
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assessment_pending';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assessment_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_pending';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'under_hr_review';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'shortlisted';

-- 2. Add columns to applications table for rejection reasons and AI score overrides
ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_overrides jsonb NOT NULL DEFAULT '{}';

-- 3. Add is_provisional column to candidates table for invited candidates awaiting account linking
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false;

-- 4. Candidate invitations table
CREATE TABLE IF NOT EXISTS candidate_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active', -- 'active', 'used', 'revoked', 'expired'
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON candidate_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON candidate_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_job ON candidate_invitations(job_id);

-- Enable RLS on candidate_invitations
ALTER TABLE candidate_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_org_policy ON candidate_invitations;
CREATE POLICY invitations_org_policy ON candidate_invitations
  FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT portal_role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'hr')
  );

-- Enforce strict RLS on internal_notes (candidates can NEVER read internal notes)
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_notes_hr_policy ON internal_notes;
CREATE POLICY internal_notes_hr_policy ON internal_notes
  FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT portal_role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'hr')
  );
