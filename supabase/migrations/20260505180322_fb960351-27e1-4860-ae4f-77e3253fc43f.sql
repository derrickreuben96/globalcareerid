
-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role_category TEXT,
  hires_needed INTEGER NOT NULL DEFAULT 1 CHECK (hires_needed > 0),
  screening_quota INTEGER NOT NULL DEFAULT 10 CHECK (screening_quota > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_employer ON public.jobs(employer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous jobs access" ON public.jobs
  FOR SELECT TO anon USING (false);

CREATE POLICY "Admins manage all jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view open jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (status = 'open');

CREATE POLICY "Employers can view own jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.user_id = auth.uid()));

CREATE POLICY "Verified employers can insert jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.user_id = auth.uid() AND e.is_verified = true)
  );

CREATE POLICY "Employers can update own jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.user_id = auth.uid()));

CREATE POLICY "Employers can delete own jobs" ON public.jobs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.user_id = auth.uid()));

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL,
  applicant_user_id UUID NOT NULL,
  applicant_profile_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','shortlisted','interview','hired','rejected')),
  ai_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  ai_explanation TEXT,
  employment_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_user_id)
);

CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_employer ON public.applications(employer_id);
CREATE INDEX idx_applications_applicant ON public.applications(applicant_user_id);
CREATE INDEX idx_applications_status ON public.applications(status);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous applications access" ON public.applications
  FOR SELECT TO anon USING (false);

CREATE POLICY "Admins manage all applications" ON public.applications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Applicants view own applications" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "Employers view applications for their jobs" ON public.applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM employers e WHERE e.id = applications.employer_id AND e.user_id = auth.uid()));

CREATE POLICY "Applicants insert own application" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = applicant_user_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = applications.applicant_profile_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM jobs j WHERE j.id = applications.job_id AND j.employer_id = applications.employer_id AND j.status = 'open')
  );

CREATE POLICY "Employers update applications for their jobs" ON public.applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM employers e WHERE e.id = applications.employer_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM employers e WHERE e.id = applications.employer_id AND e.user_id = auth.uid()));

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock the immutable employment_snapshot and core identifiers post-insert
CREATE OR REPLACE FUNCTION public.applications_protect_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.employment_snapshot IS DISTINCT FROM OLD.employment_snapshot THEN
    RAISE EXCEPTION 'employment_snapshot is immutable';
  END IF;
  IF NEW.job_id <> OLD.job_id OR NEW.applicant_user_id <> OLD.applicant_user_id
     OR NEW.applicant_profile_id <> OLD.applicant_profile_id OR NEW.employer_id <> OLD.employer_id THEN
    RAISE EXCEPTION 'core application identifiers are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_applications_protect_immutable
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_protect_immutable();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
