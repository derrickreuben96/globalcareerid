-- Clean up redundant SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners and admins can view profiles" ON public.profiles;

-- Create a single consolidated SELECT policy for profiles
-- Users can view their own profile, admins can view all
CREATE POLICY "Profile SELECT access" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Clean up redundant SELECT policies on employers table
DROP POLICY IF EXISTS "Users can view their own employer record" ON public.employers;
DROP POLICY IF EXISTS "Employers require function access for public data" ON public.employers;

-- Create a single consolidated SELECT policy for employers
-- Owners can view their own record, admins can view all
CREATE POLICY "Employer SELECT access" 
ON public.employers 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Clean up redundant SELECT policies on disputes table  
DROP POLICY IF EXISTS "Users can view their own disputes" ON public.disputes;
DROP POLICY IF EXISTS "Users require function access for disputes" ON public.disputes;

-- Create a single consolidated SELECT policy for disputes
-- Users can view their own disputes, admins can view all
CREATE POLICY "Dispute SELECT access" 
ON public.disputes 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);