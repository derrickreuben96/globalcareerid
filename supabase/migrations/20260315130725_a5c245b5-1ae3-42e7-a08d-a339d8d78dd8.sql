
DROP POLICY IF EXISTS "Users can only insert notifications for themselves or via syste" ON public.in_app_notifications;

CREATE POLICY "Users can only insert notifications for themselves or via system"
ON public.in_app_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'employer'::app_role)
    AND EXISTS (
      SELECT 1 FROM employment_records er
      JOIN employers e ON e.id = er.employer_id
      WHERE e.user_id = auth.uid()
        AND er.user_id = in_app_notifications.user_id
        AND er.status = 'active'
    )
  )
);
