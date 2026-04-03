CREATE POLICY "Users can view own verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM work_history wh
  WHERE wh.id = verification_requests.work_history_id
  AND wh.user_id = auth.uid()
));

ALTER PUBLICATION supabase_realtime DROP TABLE public.in_app_notifications;