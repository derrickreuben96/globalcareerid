-- Fix Issue 1: Remove hardcoded keys from trigger functions
-- Update notify_employment_change to use dynamic project URL without hardcoded keys
CREATE OR REPLACE FUNCTION public.notify_employment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets from Vault
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If secrets not configured, skip notification silently
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build the payload based on operation type
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', row_to_json(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', row_to_json(NEW),
      'old_record', jsonb_build_object(
        'status', OLD.status,
        'end_date', OLD.end_date
      )
    );
  END IF;

  -- Make HTTP request to edge function using Vault secrets
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-employment-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Update notify_dispute_resolved to use dynamic project URL without hardcoded keys
CREATE OR REPLACE FUNCTION public.notify_dispute_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets from Vault
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If secrets not configured, skip notification silently
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only trigger on status change to resolved or rejected
  IF OLD.status IN ('open', 'under_review') AND NEW.status IN ('resolved', 'rejected') THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', row_to_json(NEW),
      'old_record', jsonb_build_object('status', OLD.status)
    );

    -- Make HTTP request to edge function using Vault secrets
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-dispute-resolved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix Issue 2: Add public RLS policy for employment records viewing
-- This allows unauthenticated users to view verified employment records for public profiles
CREATE POLICY "Public can view verified employment records for public profiles"
ON public.employment_records
FOR SELECT
TO public
USING (
  status IN ('active', 'ended') AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = employment_records.user_id 
    AND profiles.visibility = 'public'
  )
);