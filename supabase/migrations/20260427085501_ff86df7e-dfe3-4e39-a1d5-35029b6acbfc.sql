-- Verified Project Portfolio feature
-- Additive: no existing tables modified.

-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'draft',
    'pending_employee_confirmation',
    'active',
    'sealed',
    'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  raw_notes text,
  scope text,
  budget_range text,
  measurable_outcome text,
  start_date date NOT NULL,
  end_date date,
  status public.project_status NOT NULL DEFAULT 'draft',
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,                          -- employee auth.users.id
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,                         -- auth.users.id of the employer user
  signed_jwt text,
  employee_confirmed_at timestamptz,
  employer_sealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_employer ON public.projects(employer_id);
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_profile ON public.projects(profile_id);
CREATE INDEX idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. project_skills table
CREATE TABLE public.project_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill text NOT NULL,
  ai_extracted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_skills_project ON public.project_skills(project_id);

ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;

-- 4. project_audit_log
CREATE TABLE public.project_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_audit_project ON public.project_audit_log(project_id);

ALTER TABLE public.project_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. project_dispute_log
CREATE TABLE public.project_dispute_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  reason text NOT NULL,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_dispute_project ON public.project_dispute_log(project_id);

ALTER TABLE public.project_dispute_log ENABLE ROW LEVEL SECURITY;

-- 6. updated_at trigger reusing existing helper
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Restrict updates so only service role can change signed_jwt or set sealed status
CREATE OR REPLACE FUNCTION public.guard_project_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- signed_jwt may only be set by service role (which bypasses RLS, so this protects RLS-bound updates)
  IF (OLD.signed_jwt IS DISTINCT FROM NEW.signed_jwt) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'signed_jwt can only be modified by the system';
  END IF;

  IF (OLD.employer_sealed_at IS DISTINCT FROM NEW.employer_sealed_at) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'employer_sealed_at can only be modified by the system';
  END IF;

  IF (OLD.status = 'sealed' AND NEW.status <> 'sealed') THEN
    RAISE EXCEPTION 'Sealed projects are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_project_updates
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_project_updates();

-- 8. Auto-log inserts/status changes
CREATE OR REPLACE FUNCTION public.log_project_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_audit_log (project_id, action, performed_by, metadata)
    VALUES (NEW.id, 'created', NEW.added_by, jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_audit_log (project_id, action, performed_by, metadata)
    VALUES (NEW.id, 'status_changed', auth.uid(), jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_change();

CREATE TRIGGER log_project_status_change
AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_change();

-- 9. Helper: is the caller the verified-employer owner of this project?
CREATE OR REPLACE FUNCTION public.is_project_employer(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.employers e ON e.id = p.employer_id
    WHERE p.id = _project_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.user_id = auth.uid()
  )
$$;

-- 10. RLS POLICIES — projects
CREATE POLICY "Block anonymous access on projects"
ON public.projects FOR SELECT TO anon USING (false);

CREATE POLICY "Employees can view their own projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view projects they created"
ON public.projects FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employers e
  WHERE e.id = projects.employer_id AND e.user_id = auth.uid()
));

CREATE POLICY "Authenticated can view sealed projects on public profiles"
ON public.projects FOR SELECT TO authenticated
USING (
  status = 'sealed'
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = projects.profile_id AND pr.visibility = 'public'
  )
);

CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- INSERT: only by verified employer for their own employer record, employee must exist with matching profile_id
CREATE POLICY "Verified employers can insert projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  added_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = projects.profile_id AND p.user_id = projects.user_id
  )
);

-- UPDATE: employer can update only when project is in editable status (draft, pending, active, disputed)
CREATE POLICY "Employers can update their non-sealed projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  status <> 'sealed'
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
)
WITH CHECK (
  status <> 'sealed'
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id
      AND e.user_id = auth.uid()
      AND e.is_verified = true
  )
);

-- Employees can update only their own pending project to confirm or dispute it
CREATE POLICY "Employees can confirm or dispute their pending project"
ON public.projects FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('pending_employee_confirmation', 'active')
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('active', 'disputed', 'pending_employee_confirmation')
);

CREATE POLICY "Admins can manage all projects"
ON public.projects FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: employer can delete drafts only
CREATE POLICY "Employers can delete their drafts"
ON public.projects FOR DELETE TO authenticated
USING (
  status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.employers e
    WHERE e.id = projects.employer_id AND e.user_id = auth.uid()
  )
);

-- 11. RLS POLICIES — project_skills
CREATE POLICY "View skills follows project visibility"
ON public.project_skills FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_skills.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.employers e WHERE e.id = p.employer_id AND e.user_id = auth.uid())
        OR (p.status = 'sealed' AND EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p.profile_id AND pr.visibility = 'public'))
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Employer manages skills on their projects"
ON public.project_skills FOR ALL TO authenticated
USING (public.is_project_employer(project_id))
WITH CHECK (public.is_project_employer(project_id));

CREATE POLICY "Admins manage all project skills"
ON public.project_skills FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 12. RLS POLICIES — project_audit_log
CREATE POLICY "Project owner and employer can view audit"
ON public.project_audit_log FOR SELECT TO authenticated
USING (
  public.is_project_owner(project_id)
  OR public.is_project_employer(project_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can append audit entries"
ON public.project_audit_log FOR INSERT TO authenticated
WITH CHECK (
  performed_by = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_project_employer(project_id)
  )
);

-- 13. RLS POLICIES — project_dispute_log
CREATE POLICY "Project owner and employer view disputes"
ON public.project_dispute_log FOR SELECT TO authenticated
USING (
  raised_by = auth.uid()
  OR public.is_project_employer(project_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Project owner can raise dispute"
ON public.project_dispute_log FOR INSERT TO authenticated
WITH CHECK (
  raised_by = auth.uid()
  AND public.is_project_owner(project_id)
);

CREATE POLICY "Admins can manage disputes"
ON public.project_dispute_log FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));