-- Create audit_logs table for tracking employment record changes
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone NOT NULL DEFAULT now(),
    employer_id uuid
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Employers can view audit logs for their own records
CREATE POLICY "Employers can view their audit logs"
ON public.audit_logs FOR SELECT
USING (
    employer_id IS NOT NULL AND 
    EXISTS (SELECT 1 FROM employers WHERE id = audit_logs.employer_id AND user_id = auth.uid())
);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create notification_preferences table for opt-in email settings
CREATE TABLE public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email_on_record_added boolean NOT NULL DEFAULT true,
    email_on_record_ended boolean NOT NULL DEFAULT true,
    email_on_record_updated boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notification preferences
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_notification_prefs
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_notification_preferences();

-- Create audit log trigger function for employment_records
CREATE OR REPLACE FUNCTION public.log_employment_record_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by, employer_id)
        VALUES ('employment_records', NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid(), NEW.employer_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, employer_id)
        VALUES ('employment_records', NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid(), NEW.employer_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, performed_by, employer_id)
        VALUES ('employment_records', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid(), OLD.employer_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create the audit log trigger on employment_records
CREATE TRIGGER employment_records_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.employment_records
    FOR EACH ROW
    EXECUTE FUNCTION public.log_employment_record_changes();

-- Create secure RPC function to get employee details for employer's records only
CREATE OR REPLACE FUNCTION public.get_employer_employee_details(employer_id_param uuid)
RETURNS TABLE(
    record_id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    profile_id text,
    job_title text,
    department text,
    employment_type text,
    start_date date,
    end_date date,
    status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        er.id as record_id,
        er.user_id,
        p.first_name,
        p.last_name,
        p.profile_id,
        er.job_title,
        er.department,
        er.employment_type,
        er.start_date,
        er.end_date,
        er.status
    FROM employment_records er
    JOIN profiles p ON p.user_id = er.user_id
    JOIN employers e ON e.id = er.employer_id
    WHERE er.employer_id = employer_id_param
      AND e.user_id = auth.uid()
    ORDER BY er.start_date DESC;
$$;

-- Create function to get audit logs for employer
CREATE OR REPLACE FUNCTION public.get_employer_audit_logs(employer_id_param uuid)
RETURNS TABLE(
    id uuid,
    action text,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone,
    performer_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        al.id,
        al.action,
        al.old_data,
        al.new_data,
        al.performed_by,
        al.performed_at,
        COALESCE(p.first_name || ' ' || p.last_name, 'System') as performer_name
    FROM audit_logs al
    LEFT JOIN profiles p ON p.user_id = al.performed_by
    JOIN employers e ON e.id = al.employer_id
    WHERE al.employer_id = employer_id_param
      AND e.user_id = auth.uid()
    ORDER BY al.performed_at DESC
    LIMIT 100;
$$;

-- Create function to get user's notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(target_user_id uuid)
RETURNS TABLE(
    email_on_record_added boolean,
    email_on_record_ended boolean,
    email_on_record_updated boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        np.email_on_record_added,
        np.email_on_record_ended,
        np.email_on_record_updated
    FROM notification_preferences np
    WHERE np.user_id = target_user_id;
$$;