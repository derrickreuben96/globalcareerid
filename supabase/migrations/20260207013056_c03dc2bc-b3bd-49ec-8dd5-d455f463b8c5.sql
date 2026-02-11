-- Update notify_employment_change trigger function to use service role key from Vault
CREATE OR REPLACE FUNCTION public.notify_employment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets from Vault/settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Only proceed if we have the required settings
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing Supabase configuration for employment change notification';
    RETURN NEW;
  END IF;

  -- Make HTTP request to edge function with service role key
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-employment-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );

  RETURN NEW;
END;
$$;

-- Update notify_dispute_resolved trigger function to use service role key from Vault
CREATE OR REPLACE FUNCTION public.notify_dispute_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets from Vault/settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Only proceed if we have the required settings
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Missing Supabase configuration for dispute notification';
    RETURN NEW;
  END IF;

  -- Only notify on status changes to resolved or rejected
  IF TG_OP = 'UPDATE' AND 
     (OLD.status = 'open' OR OLD.status = 'under_review') AND
     (NEW.status = 'resolved' OR NEW.status = 'rejected') THEN
    
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-dispute-resolved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;