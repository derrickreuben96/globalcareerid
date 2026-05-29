
-- 1. Restrict audit_logs new_data/old_data PII columns to service_role only
REVOKE SELECT (new_data, old_data) ON public.audit_logs FROM authenticated, anon;
GRANT SELECT (new_data, old_data) ON public.audit_logs TO service_role;

-- 2. Tighten role_history INSERT policy to require verified employer
DROP POLICY IF EXISTS "Employers can insert role history" ON public.role_history;
CREATE POLICY "Employers can insert role history"
ON public.role_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employment_records er
    JOIN employers e ON e.id = er.employer_id
    WHERE er.id = role_history.employment_record_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
);

-- 3. Allow users to delete their own pending (unreviewed) verification documents
CREATE POLICY "Users can delete own pending verification documents"
ON public.verification_documents
FOR DELETE
TO authenticated
USING (
  review_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM work_history wh
    WHERE wh.id = verification_documents.work_history_id
      AND wh.user_id = auth.uid()
  )
);
