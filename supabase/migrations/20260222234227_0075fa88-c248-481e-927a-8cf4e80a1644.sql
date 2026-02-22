-- Fix infinite recursion: has_role() queries user_roles, 
-- but user_roles RLS calls has_role() → deadlock.
-- Solution: Make has_role SECURITY DEFINER to bypass RLS.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;