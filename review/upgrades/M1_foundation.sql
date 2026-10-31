-- REVIEW ONLY — NOT APPLIED. Phase 0: foundation. Additive; no existing object changed.

CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags readable" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "admins manage flags" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_flags (key, description) VALUES
 ('employer_members','Phase 1 team accounts'),
 ('privacy_centre','Phase 2 privacy centre'),
 ('deletion_runner','Phase 2 automatic deletion — requires legal sign-off'),
 ('education_records','Phase 3 education/certifications'),
 ('career_passport','Phase 4 passport + share links'),
 ('talent_search','Phase 5 skills search'),
 ('interview_scheduling','Phase 6 interviews')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = _key), false)
$$;
REVOKE ALL ON FUNCTION public.is_feature_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text) TO anon, authenticated, service_role;

-- Append-only access log; no client writes.
CREATE TABLE public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid,            -- whose data was accessed
  actor_user_id uuid,              -- null for anonymous share-link viewers
  actor_employer_id uuid,
  action text NOT NULL,            -- e.g. share_view, talent_search, member_change
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_audit_subject_idx ON public.access_audit_log (subject_user_id, created_at DESC);
GRANT SELECT ON public.access_audit_log TO authenticated;
GRANT ALL ON public.access_audit_log TO service_role;
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject reads own access log" ON public.access_audit_log FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.write_access_audit(_subject uuid, _employer uuid, _action text,
  _target_type text, _target_id uuid, _meta jsonb DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.access_audit_log(subject_user_id, actor_user_id, actor_employer_id, action, target_type, target_id, metadata)
  VALUES (_subject, auth.uid(), _employer, left(_action,100), _target_type, _target_id, _meta)
$$;
REVOKE ALL ON FUNCTION public.write_access_audit(uuid,uuid,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_access_audit(uuid,uuid,text,text,uuid,jsonb) TO service_role;

-- Central org helper. v1 = owner only (identical to today's e.user_id = auth.uid()).
-- M2 replaces the body to also accept active members; signature never changes.
CREATE OR REPLACE FUNCTION public.has_org_role(_employer_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employers e WHERE e.id = _employer_id AND e.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.has_org_role(uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid,text[]) TO authenticated, service_role;
