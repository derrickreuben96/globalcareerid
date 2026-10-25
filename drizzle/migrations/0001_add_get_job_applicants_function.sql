CREATE OR REPLACE FUNCTION public.get_job_applicants(job_id_param uuid)
RETURNS TABLE(application_id uuid, profile_id text, first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT a.id, p.profile_id, p.first_name, p.last_name
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.profiles p ON p.id = a.applicant_profile_id
  WHERE a.job_id = job_id_param
    AND (
      j.employer_id IN (SELECT e.id FROM public.employers e WHERE e.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    );
$$;