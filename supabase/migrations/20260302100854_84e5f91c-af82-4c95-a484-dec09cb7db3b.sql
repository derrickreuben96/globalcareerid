
-- Create referral_letters table
CREATE TABLE public.referral_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employment_record_id UUID NOT NULL REFERENCES public.employment_records(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'ai'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_letters ENABLE ROW LEVEL SECURITY;

-- Employers can manage letters they created
CREATE POLICY "Employers can insert their own referral letters"
  ON public.referral_letters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM employers e WHERE e.id = referral_letters.employer_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Employers can view their own referral letters"
  ON public.referral_letters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employers e WHERE e.id = referral_letters.employer_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Employers can update their own referral letters"
  ON public.referral_letters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM employers e WHERE e.id = referral_letters.employer_id AND e.user_id = auth.uid()
  ));

-- Employees can view their own referral letters
CREATE POLICY "Employees can view their referral letters"
  ON public.referral_letters FOR SELECT
  USING (auth.uid() = employee_user_id);

-- Admins full access
CREATE POLICY "Admins full access to referral letters"
  ON public.referral_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to sync employment_records to work_history
CREATE OR REPLACE FUNCTION public.sync_employment_to_work_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _company_name TEXT;
BEGIN
  -- Get company name from employers table
  SELECT company_name INTO _company_name FROM employers WHERE id = NEW.employer_id;

  IF TG_OP = 'INSERT' THEN
    -- Create a work_history entry for the employee, marked as employer_verified
    INSERT INTO work_history (user_id, company_name, role, department, employment_type, start_date, end_date, verification_status, verification_method)
    VALUES (
      NEW.user_id,
      _company_name,
      NEW.job_title,
      NEW.department,
      NEW.employment_type,
      NEW.start_date,
      NEW.end_date,
      'employer_verified',
      'employer_record'
    )
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update the matching work_history entry
    UPDATE work_history
    SET role = NEW.job_title,
        department = NEW.department,
        employment_type = NEW.employment_type,
        start_date = NEW.start_date,
        end_date = NEW.end_date,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND company_name = _company_name
      AND verification_method = 'employer_record';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on employment_records
CREATE TRIGGER sync_employment_to_work_history_trigger
AFTER INSERT OR UPDATE ON public.employment_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_employment_to_work_history();
