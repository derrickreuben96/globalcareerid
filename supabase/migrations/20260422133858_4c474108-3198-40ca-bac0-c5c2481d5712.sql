-- Drop the user-facing SELECT policy that exposes the secret token column.
-- Users will continue to access their verification requests via the existing
-- get_user_verification_requests() SECURITY DEFINER function, which excludes
-- the token column from its return type.
DROP POLICY IF EXISTS "Users can view own verification requests" ON public.verification_requests;