
-- 1) Lock employer self-elevation of verification status
DROP POLICY IF EXISTS "Users can update their own employer record" ON public.employers;

CREATE POLICY "Users can update their own employer record"
ON public.employers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_verified IS NOT DISTINCT FROM (SELECT e2.is_verified FROM public.employers e2 WHERE e2.id = employers.id)
  AND verification_status IS NOT DISTINCT FROM (SELECT e2.verification_status FROM public.employers e2 WHERE e2.id = employers.id)
  AND verification_notes IS NOT DISTINCT FROM (SELECT e2.verification_notes FROM public.employers e2 WHERE e2.id = employers.id)
);

-- 2) Restrict dispute self-update to the `reason` field only
DROP POLICY IF EXISTS "Users can update open disputes" ON public.disputes;

CREATE POLICY "Users can update open disputes"
ON public.disputes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'open')
WITH CHECK (
  auth.uid() = user_id
  AND status = 'open'
  AND admin_notes  IS NOT DISTINCT FROM (SELECT d2.admin_notes  FROM public.disputes d2 WHERE d2.id = disputes.id)
  AND resolved_by  IS NOT DISTINCT FROM (SELECT d2.resolved_by  FROM public.disputes d2 WHERE d2.id = disputes.id)
  AND resolved_at  IS NOT DISTINCT FROM (SELECT d2.resolved_at  FROM public.disputes d2 WHERE d2.id = disputes.id)
  AND employment_record_id IS NOT DISTINCT FROM (SELECT d2.employment_record_id FROM public.disputes d2 WHERE d2.id = disputes.id)
);

-- 3) Allow users to delete their own pending verification requests (GDPR)
CREATE POLICY "Users can delete own pending verification requests"
ON public.verification_requests
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.work_history wh
    WHERE wh.id = verification_requests.work_history_id
      AND wh.user_id = auth.uid()
  )
);

-- 4) Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.applications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.jobs;
