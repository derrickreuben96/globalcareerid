
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type text;
  _first_name text;
  _last_name text;
  _email_prefix text;
BEGIN
  _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'career_individual');
  _email_prefix := split_part(NEW.email, '@', 1);
  
  -- Extract names from metadata, falling back to Google/OAuth full_name, then email prefix
  _first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  _last_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  
  -- If first_name is still null, try to extract from full_name (Google OAuth provides this)
  IF _first_name IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    _first_name := split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1);
    IF _last_name IS NULL AND position(' ' in NEW.raw_user_meta_data->>'full_name') > 0 THEN
      _last_name := substring(NEW.raw_user_meta_data->>'full_name' from position(' ' in NEW.raw_user_meta_data->>'full_name') + 1);
    END IF;
  END IF;

  -- Also try 'name' field (some OAuth providers use this)
  IF _first_name IS NULL AND NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    _first_name := split_part(NEW.raw_user_meta_data->>'name', ' ', 1);
    IF _last_name IS NULL AND position(' ' in NEW.raw_user_meta_data->>'name') > 0 THEN
      _last_name := substring(NEW.raw_user_meta_data->>'name' from position(' ' in NEW.raw_user_meta_data->>'name') + 1);
    END IF;
  END IF;

  -- Final fallback: use email prefix
  IF _first_name IS NULL THEN
    _first_name := _email_prefix;
  END IF;
  IF _last_name IS NULL THEN
    _last_name := '';
  END IF;
  
  IF _account_type = 'organization' THEN
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email, account_type)
    VALUES (
      NEW.id,
      public.generate_profile_id(),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), ''), _first_name),
      _last_name,
      NEW.email,
      'organization'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.organization_profiles (user_id, company_name)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), ''), _first_name)
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
      _first_name,
      _last_name,
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
$$;
