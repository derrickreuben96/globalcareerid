
-- 1) Credentials: prevent owners from modifying anything except revocation fields
CREATE OR REPLACE FUNCTION public.guard_credentials_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.signed_jwt IS DISTINCT FROM OLD.signed_jwt
     OR NEW.employer_id IS DISTINCT FROM OLD.employer_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.employment_record_id IS DISTINCT FROM OLD.employment_record_id
  THEN
    RAISE EXCEPTION 'Only revocation fields may be modified on a credential';
  END IF;

  -- Only allow setting revoked_at to a non-null value and revoked_by to current user
  IF NEW.revoked_at IS NOT NULL AND NEW.revoked_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'revoked_by must be set to the current user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credentials_guard_updates ON public.credentials;
CREATE TRIGGER credentials_guard_updates
BEFORE UPDATE ON public.credentials
FOR EACH ROW EXECUTE FUNCTION public.guard_credentials_updates();

-- 2) Recovery codes: stop returning code_hash to clients
DROP POLICY IF EXISTS "Users can view own recovery codes" ON public.recovery_codes;

-- Provide a safe metadata-only RPC for users that need to list their codes
CREATE OR REPLACE FUNCTION public.get_my_recovery_codes_metadata()
RETURNS TABLE(id uuid, used_at timestamptz, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, used_at, created_at
  FROM public.recovery_codes
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_recovery_codes_metadata() TO authenticated;

-- 3) Verification requests: stop returning token_hash to clients
DROP POLICY IF EXISTS "Users can view their verification requests" ON public.verification_requests;

-- Safe RPC excluding token_hash (mirrors existing get_user_verification_requests behavior)
-- get_user_verification_requests already exists and excludes token_hash; ensure execute grant
GRANT EXECUTE ON FUNCTION public.get_user_verification_requests(uuid) TO authenticated;
