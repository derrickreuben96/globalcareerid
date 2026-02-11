-- Add explicit anonymous access denial policies for defense-in-depth
-- This ensures unauthenticated users cannot access any data

-- Block anonymous access to profiles
CREATE POLICY "Block anonymous access" 
ON public.profiles 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to employers
CREATE POLICY "Block anonymous access" 
ON public.employers 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to audit_logs  
CREATE POLICY "Block anonymous access" 
ON public.audit_logs 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to disputes
CREATE POLICY "Block anonymous access" 
ON public.disputes 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to employment_records
CREATE POLICY "Block anonymous access" 
ON public.employment_records 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to notification_preferences
CREATE POLICY "Block anonymous access" 
ON public.notification_preferences 
FOR SELECT 
TO anon 
USING (false);

-- Block anonymous access to user_roles
CREATE POLICY "Block anonymous access" 
ON public.user_roles 
FOR SELECT 
TO anon 
USING (false);