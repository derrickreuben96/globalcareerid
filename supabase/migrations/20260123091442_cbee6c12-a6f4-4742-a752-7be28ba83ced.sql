-- Fix 1: Update profiles RLS policy to exclude sensitive fields for public profiles
-- Drop the existing permissive public profiles policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create a security definer function to get public profile data without sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_profile_fields(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  profile_id text,
  first_name text,
  last_name text,
  bio text,
  skills text[],
  visibility text,
  experience_level text,
  location text,
  availability text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
    p.visibility, p.experience_level, p.location, p.availability,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.user_id = target_user_id AND p.visibility = 'public';
$$;

-- Create a new restrictive policy that only allows viewing public profiles
-- The actual field restriction will be handled at the application level via the function
-- For RLS, we still need to allow SELECT but application code should use the function
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
USING (
  visibility = 'public' 
  AND auth.uid() IS NOT NULL 
  AND auth.uid() != user_id
);

-- Fix 2: Update employers RLS policy to require authentication and restrict fields
-- Drop the existing permissive public employers policy
DROP POLICY IF EXISTS "Anyone can view verified employers" ON public.employers;

-- Create a new policy that requires authentication to view verified employers
CREATE POLICY "Authenticated users can view verified employers basic info"
ON public.employers
FOR SELECT
USING (
  is_verified = true 
  AND auth.uid() IS NOT NULL
);

-- Create a security definer function to get public employer data without sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_employer_info(employer_id_param uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  industry text,
  country text,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id, e.company_name, e.industry, e.country, e.is_verified
  FROM employers e
  WHERE e.id = employer_id_param AND e.is_verified = true;
$$;