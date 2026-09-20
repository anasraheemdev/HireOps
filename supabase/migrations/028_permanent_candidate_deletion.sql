-- ============================================================================
-- 028: Permanent Candidate Deletion RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_candidate_permanently(
  p_candidate_id UUID,
  p_actor_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cand RECORD;
  v_prof RECORD;
  v_actor_prof RECORD;
  v_applications_count INT := 0;
  v_assessments_count INT := 0;
  v_interviews_count INT := 0;
  v_documents_count INT := 0;
  v_offers_count INT := 0;
  v_messages_count INT := 0;
  v_result JSONB;
BEGIN
  -- 1. Locate candidate record
  SELECT * INTO v_cand FROM candidates WHERE id = p_candidate_id;
  IF v_cand.id IS NULL THEN
    RAISE EXCEPTION 'Candidate not found with ID %', p_candidate_id;
  END IF;

  -- 2. Locate linked profile (if any)
  SELECT * INTO v_prof FROM profiles WHERE candidate_id = p_candidate_id OR (email = v_cand.email AND organization_id = v_cand.organization_id);

  -- 3. Verify target is not an admin/super_admin/hr profile
  IF v_prof.id IS NOT NULL AND v_prof.portal_role IN ('super_admin', 'hr') THEN
    RAISE EXCEPTION 'Cannot delete non-candidate account with role %', v_prof.portal_role;
  END IF;

  -- 4. Locate actor profile for audit logging
  SELECT * INTO v_actor_prof FROM profiles WHERE id = p_actor_id;

  -- 5. Count dependent records before deletion
  SELECT COUNT(*) INTO v_applications_count FROM applications WHERE candidate_id = p_candidate_id;
  SELECT COUNT(*) INTO v_assessments_count FROM assessment_assignments aa JOIN applications a ON aa.application_id = a.id WHERE a.candidate_id = p_candidate_id;
  SELECT COUNT(*) INTO v_interviews_count FROM interview_sessions WHERE candidate_id = p_candidate_id;
  SELECT COUNT(*) INTO v_documents_count FROM candidate_documents WHERE candidate_id = p_candidate_id;
  SELECT COUNT(*) INTO v_offers_count FROM offers WHERE candidate_id = p_candidate_id;
  SELECT COUNT(*) INTO v_messages_count FROM portal_messages WHERE candidate_id = p_candidate_id;

  -- 6. Delete dependent records in strict referential hierarchy
  -- a. Hiring decisions & human interviews (referencing applications)
  DELETE FROM hiring_decisions WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = p_candidate_id);
  DELETE FROM human_interviews WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = p_candidate_id);

  -- b. Assessment assignments (referencing applications)
  DELETE FROM assessment_assignments WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = p_candidate_id);

  -- c. Interview messages & sessions
  DELETE FROM interview_messages WHERE session_id IN (SELECT id FROM interview_sessions WHERE candidate_id = p_candidate_id);
  DELETE FROM interview_sessions WHERE candidate_id = p_candidate_id;

  -- d. Offers
  DELETE FROM offers WHERE candidate_id = p_candidate_id;

  -- e. Saved jobs
  DELETE FROM saved_jobs WHERE candidate_id = p_candidate_id;

  -- f. Portal messages
  DELETE FROM portal_messages WHERE candidate_id = p_candidate_id;

  -- g. Candidate sub-entities
  DELETE FROM candidate_skills WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_experience WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_education WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_certifications WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_languages WHERE candidate_id = p_candidate_id;
  DELETE FROM candidate_documents WHERE candidate_id = p_candidate_id;

  -- h. Applications
  DELETE FROM applications WHERE candidate_id = p_candidate_id;

  -- i. Internal notes for candidate entity or author
  DELETE FROM internal_notes WHERE (entity_type = 'candidate' AND entity_id = p_candidate_id);
  IF v_prof.id IS NOT NULL THEN
    DELETE FROM internal_notes WHERE author_id = v_prof.id;
    DELETE FROM notifications WHERE recipient_id = v_prof.id;
  END IF;

  -- 7. Record audit log entry BEFORE profile removal
  INSERT INTO audit_logs (
    organization_id,
    actor_id,
    actor_label,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_cand.organization_id,
    p_actor_id,
    COALESCE(v_actor_prof.full_name, v_actor_prof.email, 'Super Admin'),
    'candidate_permanently_deleted',
    'candidate',
    p_candidate_id,
    jsonb_build_object(
      'candidate_email', v_cand.email,
      'candidate_name', v_cand.full_name,
      'profile_id', v_prof.id,
      'reason', p_reason,
      'deleted_counts', jsonb_build_object(
        'applications', v_applications_count,
        'assessments', v_assessments_count,
        'interviews', v_interviews_count,
        'documents', v_documents_count,
        'offers', v_offers_count,
        'messages', v_messages_count
      )
    )
  );

  -- 8. Delete candidate table record
  DELETE FROM candidates WHERE id = p_candidate_id;

  -- 9. Delete profile table record (if any)
  IF v_prof.id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = v_prof.id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'candidate_id', p_candidate_id,
    'profile_id', v_prof.id,
    'auth_user_id', v_prof.id,
    'email', v_cand.email,
    'deleted_counts', jsonb_build_object(
      'applications', v_applications_count,
      'assessments', v_assessments_count,
      'interviews', v_interviews_count,
      'documents', v_documents_count,
      'offers', v_offers_count,
      'messages', v_messages_count
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_candidate_permanently(UUID, UUID, TEXT) TO authenticated, service_role;
