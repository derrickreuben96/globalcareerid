-- Restrict access to sensitive columns: signed_jwt (credentials, projects),
-- token_hash (verification_requests), code_hash (recovery_codes)
-- by revoking column-level SELECT privileges. Service role still has full access.

REVOKE SELECT (signed_jwt) ON public.credentials FROM authenticated, anon;
REVOKE SELECT (signed_jwt) ON public.projects FROM authenticated, anon;
REVOKE SELECT (token_hash) ON public.verification_requests FROM authenticated, anon;
REVOKE SELECT (code_hash) ON public.recovery_codes FROM authenticated, anon;

-- Add explicit deny SELECT policy on recovery_codes for authenticated users
-- so any future permissive policy doesn't accidentally expose hashes.
CREATE POLICY "Deny direct SELECT on recovery codes"
  ON public.recovery_codes
  FOR SELECT
  TO authenticated
  USING (false);