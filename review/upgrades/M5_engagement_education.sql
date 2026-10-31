-- REVIEW ONLY — NOT APPLIED. Phase 3: engagement types + education/certifications.

ALTER TABLE public.employment_records ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'employment'
  CHECK (engagement_type IN ('employment','internship','attachment','apprenticeship','graduate_trainee','research'));
ALTER TABLE public.work_history ADD COLUMN IF NOT EXISTS engagement_type text NOT NULL DEFAULT 'employment';
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS issuer_kind text NOT NULL DEFAULT 'employer'
  CHECK (issuer_kind IN ('employer','university','training_provider'));

-- Same sync as today, plus engagement_type. Link stays on employment_record_id.
CREATE OR REPLACE FUNCTION public.sync_employment_to_work_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.work_history(user_id,company_name,role,department,employment_type,start_date,end_date,verification_status,verification_method,employment_record_id,engagement_type)
 SELECT NEW.user_id,e.company_name,NEW.job_title,NEW.department,NEW.employment_type,NEW.start_date,NEW.end_date,'employer_verified','employer_record',NEW.id,NEW.engagement_type
 FROM public.employers e WHERE e.id=NEW.employer_id
 ON CONFLICT (employment_record_id) DO UPDATE SET company_name=EXCLUDED.company_name,role=EXCLUDED.role,department=EXCLUDED.department,
   employment_type=EXCLUDED.employment_type,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,engagement_type=EXCLUDED.engagement_type,updated_at=now();
 RETURN NEW;
END $$;

CREATE TABLE public.education_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  issuer_employer_id uuid REFERENCES public.employers(id),
  institution_name text NOT NULL,
  qualification text NOT NULL,
  field_of_study text,
  start_date date,
  end_date date,
  verification_status text NOT NULL DEFAULT 'self_reported'
    CHECK (verification_status IN ('self_reported','pending','verified','rejected','revoked')),
  verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  issuer_employer_id uuid REFERENCES public.employers(id),
  issuer_name text NOT NULL,
  name text NOT NULL,
  credential_url text,
  issued_on date,
  expires_on date,
  verification_status text NOT NULL DEFAULT 'self_reported'
    CHECK (verification_status IN ('self_reported','pending','verified','rejected','revoked')),
  verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_records, public.certifications TO authenticated;
GRANT ALL ON public.education_records, public.certifications TO service_role;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Owner may only create/edit self_reported or pending rows and can never self-verify.
CREATE POLICY "own edu read" ON public.education_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (issuer_employer_id IS NOT NULL AND public.has_org_role(issuer_employer_id, ARRAY['verification_officer'])));
CREATE POLICY "own edu insert" ON public.education_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND verification_status IN ('self_reported','pending') AND verified_by IS NULL);
CREATE POLICY "own edu update" ON public.education_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND verification_status IN ('self_reported','pending','rejected'))
  WITH CHECK (user_id = auth.uid() AND verification_status IN ('self_reported','pending') AND verified_by IS NULL);
CREATE POLICY "own edu delete" ON public.education_records FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND verification_status <> 'verified');

CREATE POLICY "own cert read" ON public.certifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (issuer_employer_id IS NOT NULL AND public.has_org_role(issuer_employer_id, ARRAY['verification_officer'])));
CREATE POLICY "own cert insert" ON public.certifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND verification_status IN ('self_reported','pending') AND verified_by IS NULL);
CREATE POLICY "own cert update" ON public.certifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND verification_status IN ('self_reported','pending','rejected'))
  WITH CHECK (user_id = auth.uid() AND verification_status IN ('self_reported','pending') AND verified_by IS NULL);
CREATE POLICY "own cert delete" ON public.certifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND verification_status <> 'verified');

-- Issuer decision (only path to verified/rejected/revoked).
CREATE OR REPLACE FUNCTION public.decide_learning_record(_kind text, _id uuid, _decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE issuer uuid; subject uuid;
BEGIN
  IF NOT public.is_feature_enabled('education_records') THEN RAISE EXCEPTION 'Feature disabled'; END IF;
  IF _decision NOT IN ('verified','rejected','revoked') THEN RAISE EXCEPTION 'Bad decision'; END IF;
  IF _kind = 'education' THEN SELECT issuer_employer_id, user_id INTO issuer, subject FROM education_records WHERE id=_id FOR UPDATE;
  ELSIF _kind = 'certification' THEN SELECT issuer_employer_id, user_id INTO issuer, subject FROM certifications WHERE id=_id FOR UPDATE;
  ELSE RAISE EXCEPTION 'Bad kind'; END IF;
  IF issuer IS NULL OR NOT EXISTS (SELECT 1 FROM employers WHERE id=issuer AND is_verified)
     OR NOT public.has_org_role(issuer, ARRAY['verification_officer']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF _kind = 'education' THEN
    UPDATE education_records SET verification_status=_decision, verified_by=auth.uid(), verified_at=now(), updated_at=now() WHERE id=_id;
  ELSE
    UPDATE certifications SET verification_status=_decision, verified_by=auth.uid(), verified_at=now(), updated_at=now() WHERE id=_id;
  END IF;
  PERFORM write_access_audit(subject, issuer, 'learning_record_'||_decision, _kind, _id, NULL);
END $$;
REVOKE ALL ON FUNCTION public.decide_learning_record(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_learning_record(text,uuid,text) TO authenticated;
