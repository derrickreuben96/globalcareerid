-- Drop existing triggers and function
DROP TRIGGER IF EXISTS on_employment_record_insert ON public.employment_records;
DROP TRIGGER IF EXISTS on_employment_record_update ON public.employment_records;
DROP FUNCTION IF EXISTS public.notify_employment_change();

-- Create function to notify on employment record changes using direct project URL
CREATE OR REPLACE FUNCTION public.notify_employment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
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

  -- Make HTTP request to edge function using project URL
  PERFORM net.http_post(
    url := 'https://sxpmsgssuhnxaejuczuo.supabase.co/functions/v1/notify-employment-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cG1zZ3NzdWhueGFlanVjenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDU5NjEsImV4cCI6MjA4NDcyMTk2MX0.9q5mz8LyKGFzLh4WPwp8E-oMV2eFeV0XskjWuHJDIu0'
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