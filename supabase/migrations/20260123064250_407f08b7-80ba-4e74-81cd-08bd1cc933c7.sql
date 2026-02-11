-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify on employment record changes
CREATE OR REPLACE FUNCTION public.notify_employment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
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

  -- Get Supabase URL from environment (will be set via vault)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Make HTTP request to edge function
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

-- Create trigger for employment record insertions
CREATE TRIGGER on_employment_record_insert
  AFTER INSERT ON public.employment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_employment_change();

-- Create trigger for employment record updates
CREATE TRIGGER on_employment_record_update
  AFTER UPDATE ON public.employment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_employment_change();