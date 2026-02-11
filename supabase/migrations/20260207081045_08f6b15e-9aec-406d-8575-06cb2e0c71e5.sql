-- Drop the profiles_public view as it bypasses RLS protections
-- The profiles table already has proper RLS policy "Authenticated users can view public profiles via view"
-- which provides secure access to public profiles
DROP VIEW IF EXISTS public.profiles_public;