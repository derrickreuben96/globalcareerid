-- Fix 1: Organization profiles - prevent self-verification
-- Drop and recreate the update policy with WITH CHECK that prevents modifying verification fields
DROP POLICY IF EXISTS "Users can update their own org profile" ON organization_profiles;
CREATE POLICY "Users can update their own org profile" ON organization_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_verified IS NOT DISTINCT FROM (SELECT op.is_verified FROM organization_profiles op WHERE op.id = organization_profiles.id)
    AND verification_status IS NOT DISTINCT FROM (SELECT op.verification_status FROM organization_profiles op WHERE op.id = organization_profiles.id)
    AND verification_notes IS NOT DISTINCT FROM (SELECT op.verification_notes FROM organization_profiles op WHERE op.id = organization_profiles.id)
  );

-- Fix 2: Verification requests - remove user SELECT access to token column
-- Replace the existing SELECT policy with one that uses a restricted view approach
-- We'll use a security definer function instead
DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;

-- Create a policy that excludes the token column by using a restrictive approach
-- Since RLS can't do column-level security, we revoke direct SELECT and provide an RPC
REVOKE SELECT ON verification_requests FROM authenticated;

-- Re-grant SELECT but only for admins via their existing ALL policy
-- Create a safe function for users to check their verification request status
CREATE OR REPLACE FUNCTION public.get_user_verification_requests(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  work_history_id uuid,
  employer_email text,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    vr.id,
    vr.work_history_id,
    vr.employer_email,
    vr.status,
    vr.expires_at,
    vr.created_at
  FROM verification_requests vr
  JOIN work_history wh ON wh.id = vr.work_history_id
  WHERE wh.user_id = target_user_id
    AND auth.uid() = target_user_id;
$$;