DROP POLICY IF EXISTS "Employers can view their own audit logs" ON public.audit_logs;

CREATE POLICY "Employers can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (
  employer_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.employers
    WHERE employers.id = audit_logs.employer_id
      AND employers.user_id = auth.uid()
  )
);