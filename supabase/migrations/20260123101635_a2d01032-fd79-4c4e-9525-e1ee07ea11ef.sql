-- Create a new function for public profile lookup by profile_id (for verification page)
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.user_id, p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
    p.visibility, p.experience_level, p.location, p.availability,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.profile_id = UPPER(profile_id_param);
$$;

-- Create a function for talent search (returns multiple public profiles without sensitive data)
CREATE OR REPLACE FUNCTION public.search_public_profiles(
  skill_filter text[] DEFAULT NULL,
  experience_filter text DEFAULT NULL,
  availability_filter text DEFAULT NULL
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.profile_id, p.first_name, p.last_name, p.skills,
    p.location, p.visibility, p.experience_level, p.availability
  FROM profiles p
  WHERE p.visibility = 'public'
    AND (experience_filter IS NULL OR experience_filter = 'all' OR p.experience_level = experience_filter)
    AND (availability_filter IS NULL OR availability_filter = 'all' OR p.availability = availability_filter)
  ORDER BY p.first_name;
$$;