
-- Add national_id and passport_number to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS national_id text,
ADD COLUMN IF NOT EXISTS passport_number text,
ADD COLUMN IF NOT EXISTS profile_complete boolean NOT NULL DEFAULT false;

-- Add unique index on national_id for duplicate checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_national_id 
ON public.profiles (national_id) WHERE national_id IS NOT NULL AND national_id != '';

-- Create experience update requests table
CREATE TABLE public.experience_update_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  employment_record_id uuid NOT NULL REFERENCES public.employment_records(id),
  employer_id uuid NOT NULL REFERENCES public.employers(id),
  requested_changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own update requests"
ON public.experience_update_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create update requests"
ON public.experience_update_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can view their update requests"
ON public.experience_update_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employers e 
    WHERE e.id = experience_update_requests.employer_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Employers can update their update requests"
ON public.experience_update_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employers e 
    WHERE e.id = experience_update_requests.employer_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Admins full access to update requests"
ON public.experience_update_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_exp_update_req_user ON public.experience_update_requests(user_id);
CREATE INDEX idx_exp_update_req_employer ON public.experience_update_requests(employer_id);
CREATE INDEX idx_exp_update_req_status ON public.experience_update_requests(status);

-- Create bulk upload history table
CREATE TABLE public.bulk_upload_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employers(id),
  uploaded_by uuid NOT NULL,
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  attached_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  results jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view own upload logs"
ON public.bulk_upload_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employers e 
    WHERE e.id = bulk_upload_logs.employer_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Employers can insert upload logs"
ON public.bulk_upload_logs FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins full access to upload logs"
ON public.bulk_upload_logs FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
