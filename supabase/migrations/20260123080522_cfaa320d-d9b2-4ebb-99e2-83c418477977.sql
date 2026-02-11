-- Create function to notify when dispute is resolved
CREATE OR REPLACE FUNCTION public.notify_dispute_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  payload jsonb;
BEGIN
  -- Only trigger on status change to resolved or rejected
  IF OLD.status IN ('open', 'under_review') AND NEW.status IN ('resolved', 'rejected') THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', row_to_json(NEW),
      'old_record', jsonb_build_object('status', OLD.status)
    );

    -- Make HTTP request to edge function
    PERFORM net.http_post(
      url := 'https://sxpmsgssuhnxaejuczuo.supabase.co/functions/v1/notify-dispute-resolved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cG1zZ3NzdWhueGFlanVjenVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDU5NjEsImV4cCI6MjA4NDcyMTk2MX0.9q5mz8LyKGFzLh4WPwp8E-oMV2eFeV0XskjWuHJDIu0'
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on disputes table
CREATE TRIGGER on_dispute_resolved
  AFTER UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dispute_resolved();