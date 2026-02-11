
-- Step 1: Add account_type to the app_role enum isn't needed since we use a separate approach
-- We'll track account type via a new column on profiles + a new organization_profiles table

-- Add account_type column to profiles (for career individuals, this is their main profile)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'career_individual';

-- Create organization_profiles table (completely separate from career profiles)
CREATE TABLE public.organization_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  organization_id text NOT NULL DEFAULT public.generate_employer_id(),
  company_name text NOT NULL,
  registration_number text,
  country text,
  industry text,
  website text,
  phone text,
  address text,
  logo_url text,
  is_verified boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'pending',
  verification_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_profiles
CREATE POLICY "Block anonymous access" ON public.organization_profiles
  FOR SELECT USING (false);

CREATE POLICY "Owners can view their org profile" ON public.organization_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all org profiles" ON public.organization_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all org profiles" ON public.organization_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own org profile" ON public.organization_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own org profile" ON public.organization_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_organization_profiles_updated_at
  BEFORE UPDATE ON public.organization_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Mark existing profiles as career_individual
UPDATE public.profiles SET account_type = 'career_individual' WHERE account_type IS NULL OR account_type = 'career_individual';

-- Update handle_new_user to accept account_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
BEGIN
  _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'career_individual');
  
  IF _account_type = 'organization' THEN
    -- Create a minimal profile row for auth reference
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email, account_type)
    VALUES (
      NEW.id,
      public.generate_profile_id(),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Org'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Admin'),
      NEW.email,
      'organization'
    );
    
    -- Create organization profile
    INSERT INTO public.organization_profiles (user_id, company_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization')
    );
    
    -- Add employer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employer');
  ELSE
    -- Career individual flow (existing behavior)
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email, account_type)
    VALUES (
      NEW.id,
      public.generate_profile_id(),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      'career_individual'
    );
    
    -- Add default job_seeker role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'job_seeker');
  END IF;
  
  RETURN NEW;
END;
$function$;
