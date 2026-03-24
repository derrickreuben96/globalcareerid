-- Drop the overly permissive policy that exposes all credentials to anyone
DROP POLICY IF EXISTS "Anyone can verify credentials by JWT" ON credentials;

-- Add admin access policy for credentials
CREATE POLICY "Admins can view all credentials" ON credentials
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));