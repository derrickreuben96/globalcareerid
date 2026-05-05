CREATE OR REPLACE FUNCTION public.get_public_job_for_apply(job_id_param uuid, employer_id_param uuid)
RETURNS TABLE(id uuid, title text, description text, role_category text, status text, employer_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT j.id, j.title, j.description, j.role_category, j.status, j.employer_id
  FROM jobs j
  JOIN employers e ON e.id = j.employer_id
  WHERE j.id = job_id_param
    AND j.employer_id = employer_id_param
    AND j.status = 'open'
    AND e.is_verified = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_job_for_apply(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_job_for_apply(uuid, uuid) TO anon, authenticated;