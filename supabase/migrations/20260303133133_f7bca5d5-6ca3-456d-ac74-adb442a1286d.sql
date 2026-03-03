
-- 1. FIX: is_employed_by should only return true for ACTIVE employment
CREATE OR REPLACE FUNCTION public.is_employed_by(employer_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employment_records
    WHERE employer_id = employer_id_param
    AND user_id = user_id_param
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  )
$$;

-- 2. FIX: Restrict audit_logs employer view to only their own actions
DROP POLICY IF EXISTS "Employers can view their audit logs" ON public.audit_logs;
CREATE POLICY "Employers can view their own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  employer_id IS NOT NULL
  AND performed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM employers
    WHERE employers.id = audit_logs.employer_id
    AND employers.user_id = auth.uid()
  )
);
