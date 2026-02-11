-- Fix: Drop the security definer view and recreate with security_invoker=on
-- This ensures RLS policies of the querying user are enforced

DROP VIEW IF EXISTS public.profiles_public_safe;

-- Recreate view with security_invoker enabled
CREATE VIEW public.profiles_public_safe
WITH (security_invoker=on) AS
SELECT 
  id,
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
FROM profiles
WHERE visibility = 'public';

-- Note: email, phone, country, citizenship, user_id are intentionally excluded
-- The view enforces the querying user's RLS policies