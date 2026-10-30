-- 1. approve_promotion: caller-derived approver, owner/admin only, row lock
CREATE OR REPLACE FUNCTION public.approve_promotion(request_id_param uuid, approver_id uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req RECORD;
  caller uuid := auth.uid();
BEGIN
  -- approver_id is accepted only for client compatibility and is ignored.
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT pr.* INTO req FROM promotion_requests pr
   WHERE pr.id = request_id_param AND pr.status = 'pending'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion request not found or already processed';
  END IF;

  IF NOT (
    public.has_role(caller, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM employment_records er
      JOIN employers e ON e.id = er.employer_id
      WHERE er.id = req.employment_record_id
        AND e.user_id = caller
        AND e.is_verified = true
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve this promotion' USING ERRCODE = '42501';
  END IF;

  UPDATE role_history
  SET role_end_date = req.effective_date - INTERVAL '1 day'
  WHERE employment_record_id = req.employment_record_id
    AND role_end_date IS NULL;

  INSERT INTO role_history (employment_record_id, role_title, department, role_start_date, promotion_type, approved_by, approval_timestamp)
  VALUES (req.employment_record_id, req.proposed_role_title, req.proposed_department, req.effective_date, req.promotion_type, caller, now());

  UPDATE employment_records
  SET job_title = req.proposed_role_title,
      department = COALESCE(req.proposed_department, department),
      updated_at = now()
  WHERE id = req.employment_record_id;

  UPDATE promotion_requests
  SET status = 'approved', reviewed_by = caller, review_timestamp = now(), updated_at = now()
  WHERE id = request_id_param;

  INSERT INTO in_app_notifications (user_id, title, message, type, link)
  VALUES (req.employee_id, 'Promotion Approved', 'Your role update to ' || req.proposed_role_title || ' has been approved.', 'success', '/dashboard');
END;
$function$;

-- 2. Public profile lookup: public profiles only, no internal ids
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(text);
CREATE FUNCTION public.get_public_profile_by_id(profile_id_param text)
 RETURNS TABLE(profile_id text, first_name text, last_name text, bio text, skills text[], visibility text, experience_level text, location text, availability text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
         p.visibility, p.experience_level, p.location, p.availability, p.created_at
  FROM profiles p
  WHERE p.profile_id = UPPER(profile_id_param)
    AND p.visibility = 'public';
$function$;

-- 3. Employment lookup: public profile, or owner/admin
CREATE OR REPLACE FUNCTION public.get_employment_by_profile_id(profile_id_param text)
 RETURNS TABLE(id uuid, job_title text, department text, employment_type text, start_date date, end_date date, status text, employer_id uuid, employer_name text, employer_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT er.id, er.job_title, er.department, er.employment_type, er.start_date, er.end_date, er.status,
         e.id, e.company_name, e.is_verified
  FROM employment_records er
  JOIN employers e ON e.id = er.employer_id
  JOIN profiles p ON p.user_id = er.user_id
  WHERE p.profile_id = UPPER(profile_id_param)
    AND er.status IN ('active', 'ended')
    AND (
      p.visibility = 'public'
      OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    )
  ORDER BY er.start_date DESC;
$function$;

-- 4. Employer-only Career ID resolution (replaces user_id from the public lookup)
CREATE OR REPLACE FUNCTION public.resolve_career_id_for_employer(profile_id_param text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id FROM profiles p
  WHERE p.profile_id = UPPER(TRIM(profile_id_param))
    AND p.account_type = 'career_individual'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM employers e WHERE e.user_id = auth.uid() AND e.is_verified = true)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  LIMIT 1;
$function$;

-- 5. log_security_event: browser callers may only log for themselves
CREATE OR REPLACE FUNCTION public.log_security_event(event_type_param text, user_id_param uuid, metadata_param jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR user_id_param IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Not authorized to log events for this user' USING ERRCODE = '42501';
    END IF;
    IF length(event_type_param) > 100 THEN
      RAISE EXCEPTION 'event type too long';
    END IF;
  END IF;
  INSERT INTO security_events (event_type, user_id, metadata)
  VALUES (event_type_param, user_id_param, metadata_param);
END;
$function$;

-- 6. get_notification_preferences: self, admin or service only
CREATE OR REPLACE FUNCTION public.get_notification_preferences(target_user_id uuid)
 RETURNS TABLE(email_on_record_added boolean, email_on_record_ended boolean, email_on_record_updated boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT np.email_on_record_added, np.email_on_record_ended, np.email_on_record_updated
  FROM notification_preferences np
  WHERE np.user_id = target_user_id
    AND (
      auth.role() = 'service_role'
      OR auth.uid() = target_user_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
$function$;

-- 7. Least-privilege EXECUTE grants
-- Server-internal only
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_recovery_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_recovery_code(uuid, text) TO service_role;

-- Signed-in browser calls only
REVOKE EXECUTE ON FUNCTION public.approve_promotion(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_notification_preferences(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_career_id_for_employer(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_disputes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_employers() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_consent_logs_admin(text, text, boolean, timestamp with time zone, timestamp with time zone, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_employer_audit_logs(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_employer_disputes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_employer_employee_details(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_employer_public_info(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_job_applicants(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_employer() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_recovery_codes_metadata() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_page_visit_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_fields(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_limited(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_disputes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_disputes_safe(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_verification_requests(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_public_profiles(text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_promotion(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_notification_preferences(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_career_id_for_employer(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_disputes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_employers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consent_logs_admin(text, text, boolean, timestamp with time zone, timestamp with time zone, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_audit_logs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_disputes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_employee_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_public_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_applicants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_employer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_recovery_codes_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_page_visit_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_fields(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_limited(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_disputes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_disputes_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_verification_requests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text[], text, text) TO authenticated;

-- Intentionally public, minimal lookups (explicit)
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_employment_by_profile_id(text) TO anon, authenticated, service_role;

-- Trigger-only functions: never callable through the API
REVOKE EXECUTE ON FUNCTION public.applications_protect_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_initial_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_preferences() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_credentials_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_project_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_employment_record_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_dispute_resolved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_employment_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_recruitment_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restrict_employment_record_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_employer_history_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_employment_to_work_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_dispute_ownership() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promotion_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_role_history() FROM PUBLIC, anon, authenticated;