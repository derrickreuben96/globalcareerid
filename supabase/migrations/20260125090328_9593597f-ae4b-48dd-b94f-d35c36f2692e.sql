-- Create a function to get employment records by profile_id for verification
-- This allows verified employment records to be viewed when someone has the profile ID
CREATE OR REPLACE FUNCTION public.get_employment_by_profile_id(profile_id_param text)
RETURNS TABLE(
  id uuid,
  job_title text,
  department text,
  employment_type text,
  start_date date,
  end_date date,
  status text,
  employer_id uuid,
  employer_name text,
  employer_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    er.id,
    er.job_title,
    er.department,
    er.employment_type,
    er.start_date,
    er.end_date,
    er.status,
    e.id as employer_id,
    e.company_name as employer_name,
    e.is_verified as employer_verified
  FROM employment_records er
  JOIN employers e ON e.id = er.employer_id
  JOIN profiles p ON p.user_id = er.user_id
  WHERE p.profile_id = UPPER(profile_id_param)
    AND er.status IN ('active', 'ended')
  ORDER BY er.start_date DESC;
$$;