
-- 1) Restrict employer columns exposed to active employees
DROP POLICY IF EXISTS "Employees can view their employer info" ON public.employers;

CREATE OR REPLACE FUNCTION public.get_employer_public_info(_employer_id uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  industry text,
  country text,
  logo_url text,
  website text,
  is_verified boolean,
  employer_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.company_name, e.industry, e.country, e.logo_url, e.website, e.is_verified, e.employer_id
  FROM public.employers e
  WHERE e.id = _employer_id
    AND (
      public.is_employed_by(e.id, auth.uid())
      OR e.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_employer_public_info(uuid) TO authenticated;

-- 2) Prevent employer from writing signed_jwt on projects
DROP POLICY IF EXISTS "Employers can update their non-sealed projects" ON public.projects;
CREATE POLICY "Employers can update their non-sealed projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  status <> 'sealed'::project_status
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
)
WITH CHECK (
  status <> 'sealed'::project_status
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
  AND signed_jwt IS NOT DISTINCT FROM (SELECT p2.signed_jwt FROM public.projects p2 WHERE p2.id = projects.id)
  AND employer_sealed_at IS NOT DISTINCT FROM (SELECT p2.employer_sealed_at FROM public.projects p2 WHERE p2.id = projects.id)
);

-- 3) Allow admins to manage data export requests (fulfillment)
CREATE POLICY "Admins can view all export requests"
ON public.data_export_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update export requests"
ON public.data_export_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
