-- Create a secure public view for profiles that excludes sensitive fields
-- This view will be used for public profile access while hiding PII

-- First, drop the view if it exists (to allow recreation)
DROP VIEW IF EXISTS public.profiles_public;

-- Create the secure public view with security_invoker enabled
-- This ensures RLS policies are applied when querying through the view
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
    id,
    user_id,
    profile_id,
    first_name,
    last_name,
    bio,
    skills,
    visibility,
    experience_level,
    location,
    availability,
    created_at,
    updated_at
FROM public.profiles
WHERE visibility = 'public';

-- IMPORTANT: We need to allow authenticated users to SELECT from profiles 
-- when visibility = 'public' for the view to work with security_invoker
-- Add a policy for authenticated users to view public profiles
CREATE POLICY "Authenticated users can view public profiles via view"
ON public.profiles
FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND visibility = 'public'
);

-- Update the get_public_profile_by_id function to explicitly exclude sensitive fields
-- This function is SECURITY DEFINER and should never return PII
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(text);

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id_param text)
RETURNS TABLE(
    id uuid, 
    user_id uuid, 
    profile_id text, 
    first_name text, 
    last_name text, 
    bio text, 
    skills text[], 
    visibility text, 
    experience_level text, 
    location text, 
    availability text, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id, p.user_id, p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
    p.visibility, p.experience_level, p.location, p.availability,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.profile_id = UPPER(profile_id_param);
$$;

-- Update search_public_profiles to ensure no PII is exposed
DROP FUNCTION IF EXISTS public.search_public_profiles(text[], text, text);

CREATE OR REPLACE FUNCTION public.search_public_profiles(
    skill_filter text[] DEFAULT NULL::text[], 
    experience_filter text DEFAULT NULL::text, 
    availability_filter text DEFAULT NULL::text
)
RETURNS TABLE(
    profile_id text, 
    first_name text, 
    last_name text, 
    skills text[], 
    location text, 
    visibility text, 
    experience_level text, 
    availability text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.profile_id, p.first_name, p.last_name, p.skills,
    p.location, p.visibility, p.experience_level, p.availability
  FROM profiles p
  WHERE p.visibility = 'public'
    AND auth.uid() IS NOT NULL  -- Require authentication
    AND (experience_filter IS NULL OR experience_filter = 'all' OR p.experience_level = experience_filter)
    AND (availability_filter IS NULL OR availability_filter = 'all' OR p.availability = availability_filter)
  ORDER BY p.first_name;
$$;

-- Update get_public_profile_fields to ensure no PII is exposed  
DROP FUNCTION IF EXISTS public.get_public_profile_fields(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile_fields(target_user_id uuid)
RETURNS TABLE(
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
    created_at timestamp with time zone, 
    updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id, p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
    p.visibility, p.experience_level, p.location, p.availability,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.user_id = target_user_id AND p.visibility = 'public';
$$;

-- Add a comment documenting the security approach
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles that excludes sensitive PII (email, phone, citizenship, country). Use this view for public-facing queries.';

COMMENT ON FUNCTION public.get_public_profile_by_id(text) IS 'Retrieves public profile information by profile ID. Excludes sensitive PII fields.';

COMMENT ON FUNCTION public.search_public_profiles(text[], text, text) IS 'Searches public profiles by filters. Requires authentication. Excludes sensitive PII fields.';

COMMENT ON FUNCTION public.get_public_profile_fields(uuid) IS 'Retrieves public profile fields for a user. Excludes sensitive PII fields.';