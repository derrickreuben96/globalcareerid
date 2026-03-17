
-- Fix bulk_upload_logs INSERT: ensure employer ownership
DROP POLICY "Employers can insert upload logs" ON public.bulk_upload_logs;
CREATE POLICY "Employers can insert upload logs" ON public.bulk_upload_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM employers e
    WHERE e.id = bulk_upload_logs.employer_id
    AND e.user_id = auth.uid()
  )
);

-- Fix promotion_requests INSERT: ensure employee owns the employment record
DROP POLICY "Employees can create promotion requests" ON public.promotion_requests;
CREATE POLICY "Employees can create promotion requests" ON public.promotion_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = employee_id
  AND EXISTS (
    SELECT 1 FROM employment_records er
    WHERE er.id = promotion_requests.employment_record_id
    AND er.user_id = auth.uid()
  )
);
