-- Fix the overly permissive INSERT policy on security_events
-- Replace WITH CHECK (true) with proper user validation

DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Only allow authenticated users to insert their own security events
-- Or admins can insert for any user
CREATE POLICY "Users can log their own security events"
  ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );