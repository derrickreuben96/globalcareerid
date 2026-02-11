-- Fix ERROR: Audit logs accessible to all authenticated users
-- Remove the overly permissive 'Authenticated users base access' policy
DROP POLICY IF EXISTS "Authenticated users base access" ON public.audit_logs;

-- The remaining policies are correct:
-- "Admins can view all audit logs" - allows admin access
-- "Employers can view their audit logs" - allows employer access to their own logs

-- Fix the profiles table policy naming for clarity
-- Drop and recreate with more restrictive policy that respects visibility
DROP POLICY IF EXISTS "Public profiles require function access" ON public.profiles;

CREATE POLICY "Owners and admins can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);