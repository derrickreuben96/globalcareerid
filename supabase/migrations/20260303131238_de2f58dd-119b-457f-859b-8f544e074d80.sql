
-- 1. Create promotion_type enum
CREATE TYPE public.promotion_type AS ENUM ('initial', 'promotion', 'lateral', 'demotion');

-- 2. Create role_history table (child of employment_records)
CREATE TABLE public.role_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employment_record_id UUID NOT NULL REFERENCES public.employment_records(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  department TEXT,
  role_start_date DATE NOT NULL,
  role_end_date DATE,
  promotion_type public.promotion_type NOT NULL DEFAULT 'initial',
  approved_by UUID,
  approval_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create promotion_requests table
CREATE TABLE public.promotion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employment_record_id UUID NOT NULL REFERENCES public.employment_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  proposed_role_title TEXT NOT NULL,
  proposed_department TEXT,
  effective_date DATE NOT NULL,
  promotion_type public.promotion_type NOT NULL DEFAULT 'promotion',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  review_timestamp TIMESTAMP WITH TIME ZONE,
  reviewer_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create duplicate_risk_flags table
CREATE TABLE public.duplicate_risk_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  matched_profile_id UUID,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_flag BOOLEAN NOT NULL DEFAULT false,
  risk_reasons JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_risk_flags ENABLE ROW LEVEL SECURITY;

-- 6. RLS for role_history
CREATE POLICY "Users can view role history for their employment"
  ON public.role_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employment_records er WHERE er.id = role_history.employment_record_id AND er.user_id = auth.uid()
  ));

CREATE POLICY "Employers can view role history for their records"
  ON public.role_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employment_records er
    JOIN employers e ON e.id = er.employer_id
    WHERE er.id = role_history.employment_record_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Employers can insert role history"
  ON public.role_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM employment_records er
    JOIN employers e ON e.id = er.employer_id
    WHERE er.id = role_history.employment_record_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all role history"
  ON public.role_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public profile viewers can see role history for public profiles
CREATE POLICY "Authenticated can view role history for public profiles"
  ON public.role_history FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM employment_records er
      JOIN profiles p ON p.user_id = er.user_id
      WHERE er.id = role_history.employment_record_id
        AND p.visibility = 'public'
        AND er.status IN ('active', 'ended')
    )
  );

-- 7. RLS for promotion_requests
CREATE POLICY "Employees can view own promotion requests"
  ON public.promotion_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can create promotion requests"
  ON public.promotion_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employers can view promotion requests for their records"
  ON public.promotion_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employment_records er
    JOIN employers e ON e.id = er.employer_id
    WHERE er.id = promotion_requests.employment_record_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Employers can update promotion requests"
  ON public.promotion_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM employment_records er
    JOIN employers e ON e.id = er.employer_id
    WHERE er.id = promotion_requests.employment_record_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all promotion requests"
  ON public.promotion_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS for duplicate_risk_flags
CREATE POLICY "Admins can manage all risk flags"
  ON public.duplicate_risk_flags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Trigger: validate promotion request dates
CREATE OR REPLACE FUNCTION public.validate_promotion_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_start DATE;
BEGIN
  -- Get employment start date
  SELECT start_date INTO emp_start FROM employment_records WHERE id = NEW.employment_record_id;
  
  IF NEW.effective_date < emp_start THEN
    RAISE EXCEPTION 'Effective date cannot be before employment start date';
  END IF;
  
  IF NEW.effective_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Effective date cannot be in the future';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_promotion_request_trigger
  BEFORE INSERT ON public.promotion_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_promotion_request();

-- 10. Trigger: enforce one active role per employment
CREATE OR REPLACE FUNCTION public.validate_role_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check no overlapping active roles
  IF NEW.role_end_date IS NULL AND EXISTS (
    SELECT 1 FROM role_history
    WHERE employment_record_id = NEW.employment_record_id
      AND role_end_date IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Only one active role per employment at a time';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_role_history_trigger
  BEFORE INSERT OR UPDATE ON public.role_history
  FOR EACH ROW EXECUTE FUNCTION public.validate_role_history();

-- 11. Function to approve promotion and create role history
CREATE OR REPLACE FUNCTION public.approve_promotion(
  request_id_param UUID,
  approver_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM promotion_requests WHERE id = request_id_param AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion request not found or already processed';
  END IF;
  
  -- Close current active role
  UPDATE role_history
  SET role_end_date = req.effective_date - INTERVAL '1 day'
  WHERE employment_record_id = req.employment_record_id
    AND role_end_date IS NULL;
  
  -- Insert new role
  INSERT INTO role_history (employment_record_id, role_title, department, role_start_date, promotion_type, approved_by, approval_timestamp)
  VALUES (req.employment_record_id, req.proposed_role_title, req.proposed_department, req.effective_date, req.promotion_type, approver_id, now());
  
  -- Update the employment record's current job title
  UPDATE employment_records
  SET job_title = req.proposed_role_title,
      department = COALESCE(req.proposed_department, department),
      updated_at = now()
  WHERE id = req.employment_record_id;
  
  -- Mark request as approved
  UPDATE promotion_requests
  SET status = 'approved', reviewed_by = approver_id, review_timestamp = now(), updated_at = now()
  WHERE id = request_id_param;
  
  -- Create in-app notification
  INSERT INTO in_app_notifications (user_id, title, message, type, link)
  VALUES (req.employee_id, 'Promotion Approved', 'Your role update to ' || req.proposed_role_title || ' has been approved.', 'success', '/dashboard');
END;
$$;

-- 12. Trigger to auto-create initial role when employment record is created
CREATE OR REPLACE FUNCTION public.create_initial_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO role_history (employment_record_id, role_title, department, role_start_date, promotion_type)
  VALUES (NEW.id, NEW.job_title, NEW.department, NEW.start_date, 'initial');
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_initial_role_trigger
  AFTER INSERT ON public.employment_records
  FOR EACH ROW EXECUTE FUNCTION public.create_initial_role();

-- 13. Update updated_at on promotion_requests
CREATE TRIGGER update_promotion_requests_updated_at
  BEFORE UPDATE ON public.promotion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
