-- Create function to allow employers to view disputes for their employment records
-- This excludes admin_notes from the response for security
CREATE OR REPLACE FUNCTION public.get_employer_disputes(employer_id_param uuid)
RETURNS TABLE(
  id uuid,
  employment_record_id uuid,
  user_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id, d.employment_record_id, d.user_id,
    d.reason, d.status, d.created_at, d.updated_at, d.resolved_at
  FROM disputes d
  JOIN employment_records er ON er.id = d.employment_record_id
  JOIN employers e ON e.id = er.employer_id
  WHERE e.id = employer_id_param
  AND e.user_id = auth.uid()
  ORDER BY d.created_at DESC;
$$;