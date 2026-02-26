
-- Tighten INSERT policy to only authenticated users
DROP POLICY "Authenticated users can insert notifications" ON public.in_app_notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
