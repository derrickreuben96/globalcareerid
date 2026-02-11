-- Drop the profiles_public_safe view since it's redundant
-- All public profile access goes through secure RPC functions:
-- - search_public_profiles (for talent search)
-- - get_public_profile_by_id (for verification)
-- - get_public_profile_limited (for limited access)
-- These functions already exclude PII and enforce authentication

DROP VIEW IF EXISTS public.profiles_public_safe;