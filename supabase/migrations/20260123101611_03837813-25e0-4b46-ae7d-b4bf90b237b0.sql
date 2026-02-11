-- Fix Profile PII Exposure: Remove direct public SELECT access and force use of security definer function
-- Drop the existing permissive public profiles policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create a new policy that only allows viewing public profiles when user is the owner
-- This forces public profile data to be accessed via get_public_profile_fields() function
CREATE POLICY "Public profiles require function access"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) -- Users can always see their own profile
  OR has_role(auth.uid(), 'admin'::app_role) -- Admins can see all profiles
);

-- Fix Employer Data Exposure: Remove direct public SELECT access and force use of security definer function
-- Drop the existing permissive verified employers policy
DROP POLICY IF EXISTS "Authenticated users can view verified employers basic info" ON public.employers;

-- Create a new policy that only allows viewing employer records for owners/admins
-- This forces public employer data to be accessed via get_public_employer_info() function
CREATE POLICY "Employers require function access for public data"
ON public.employers
FOR SELECT
USING (
  (auth.uid() = user_id) -- Owners can always see their employer record
  OR has_role(auth.uid(), 'admin'::app_role) -- Admins can see all employer records
);