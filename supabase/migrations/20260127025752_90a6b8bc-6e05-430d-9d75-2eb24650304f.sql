-- Fix 1: Allow users to view their own disputes
CREATE POLICY "Users can view their own disputes"
ON public.disputes
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Update search_public_profiles to require authentication
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
    AND auth.uid() IS NOT NULL  -- Require authentication
    AND (experience_filter IS NULL OR experience_filter = 'all' OR p.experience_level = experience_filter)
    AND (availability_filter IS NULL OR availability_filter = 'all' OR p.availability = availability_filter)
  ORDER BY p.first_name;
$$;