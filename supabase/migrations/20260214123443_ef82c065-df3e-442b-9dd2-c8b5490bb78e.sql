
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
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email, account_type)
    VALUES (
      NEW.id,
      public.generate_profile_id(),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Org'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Admin'),
      NEW.email,
      'organization'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.organization_profiles (user_id, company_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization')
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employer')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email, account_type)
    VALUES (
      NEW.id,
      public.generate_profile_id(),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      'career_individual'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'job_seeker')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
