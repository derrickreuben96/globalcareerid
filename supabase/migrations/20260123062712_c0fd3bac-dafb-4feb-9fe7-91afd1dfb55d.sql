-- Fix function search_path for generate_profile_id
CREATE OR REPLACE FUNCTION public.generate_profile_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    new_id TEXT;
    year_part TEXT;
    random_part TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    new_id := 'TW-' || year_part || '-' || random_part;
    RETURN new_id;
END;
$$;

-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix function search_path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, profile_id, first_name, last_name, email)
    VALUES (
        NEW.id,
        public.generate_profile_id(),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email
    );
    
    -- Add default job_seeker role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'job_seeker');
    
    RETURN NEW;
END;
$$;