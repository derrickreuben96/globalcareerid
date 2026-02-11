-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Profile SELECT access" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access" ON public.profiles;

-- Create explicit restrictive policy: Only profile owners and admins can SELECT
-- This is a RESTRICTIVE policy that denies all access unless conditions are met
CREATE POLICY "Owners and admins can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Explicitly block anonymous access
CREATE POLICY "Block anonymous profile access"
ON public.profiles
FOR SELECT
TO anon
USING (false);