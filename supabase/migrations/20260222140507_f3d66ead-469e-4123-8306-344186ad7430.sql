
-- Create a security definer function to check if a user is employed by an employer
-- This breaks the circular RLS reference between employers and employment_records
CREATE OR REPLACE FUNCTION public.is_employed_by(employer_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employment_records
    WHERE employer_id = employer_id_param
    AND user_id = user_id_param
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Employees can view their employer info" ON public.employers;

-- Recreate using the security definer function to avoid recursion
CREATE POLICY "Employees can view their employer info"
ON public.employers
FOR SELECT
USING (public.is_employed_by(id, auth.uid()));
