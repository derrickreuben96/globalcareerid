-- Fix 1: Update employment_records policy to require authentication for viewing public profiles
-- Drop the existing permissive public access policy
DROP POLICY IF EXISTS "Public can view verified employment records for public profiles" ON public.employment_records;

-- Create new policy requiring authentication to view employment records for public profiles
CREATE POLICY "Authenticated users can view verified records for public profiles"
ON public.employment_records
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND status IN ('active', 'ended')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = employment_records.user_id
    AND profiles.visibility = 'public'
  )
);

-- Fix 2: Add explicit permissive policy for audit_logs that denies unauthenticated access
-- First, we need at least one PERMISSIVE policy for RLS to allow any access
-- The existing RESTRICTIVE policies will then further limit who can see what

-- Create a permissive base policy that requires authentication
CREATE POLICY "Authenticated users base access"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Note: The existing RESTRICTIVE policies will still filter results to only:
-- - Admins (can see all)
-- - Employers (can see their own logs)
-- This ensures unauthenticated users have NO access at all