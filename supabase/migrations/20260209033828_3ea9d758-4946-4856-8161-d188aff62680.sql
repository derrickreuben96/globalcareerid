-- CRITICAL FIX: Remove the RLS policy that exposes full profile data
-- The "Authenticated users can view public profiles via view" policy allows 
-- ANY authenticated user to select ALL columns from public profiles, including email/phone

-- Drop the problematic policy that exposes PII
DROP POLICY IF EXISTS "Authenticated users can view public profiles via view" ON public.profiles;

-- The public profile access should ONLY go through:
-- 1. search_public_profiles RPC function (excludes email/phone)
-- 2. get_public_profile_by_id RPC function (excludes email/phone)
-- 3. profiles_public_safe view (excludes sensitive columns)

-- Now profiles can only be accessed by:
-- 1. The profile owner (auth.uid() = user_id) - full access to their own data
-- 2. Admins via has_role() - full access for moderation
-- 3. SECURITY DEFINER functions that filter sensitive columns

-- Create a secure function for accessing individual public profiles
-- This replaces direct table access with controlled data exposure
CREATE OR REPLACE FUNCTION public.get_public_profile_limited(profile_id_param text)
RETURNS TABLE(
  profile_id text,
  first_name text,
  last_name text,
  bio text,
  skills text[],
  experience_level text,
  location text,
  availability text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.profile_id,
    p.first_name,
    p.last_name,
    p.bio,
    p.skills,
    p.experience_level,
    p.location,
    p.availability
  FROM profiles p
  WHERE p.profile_id = UPPER(profile_id_param)
    AND p.visibility = 'public'
    AND auth.uid() IS NOT NULL;
  -- NOTE: user_id, email, phone, country, citizenship are never exposed
$$;

-- Restrict admin notes from user dispute access by creating a user-facing function
CREATE OR REPLACE FUNCTION public.get_user_disputes_safe(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  employment_record_id uuid,
  user_id uuid,
  reason text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  resolved_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.employment_record_id,
    d.user_id,
    d.reason,
    d.status,
    d.created_at,
    d.updated_at,
    d.resolved_at
  FROM disputes d
  WHERE d.user_id = target_user_id 
    AND auth.uid() = target_user_id;
  -- NOTE: admin_notes and resolved_by are excluded from user access
$$;