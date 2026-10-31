-- REVIEW ONLY — NOT APPLIED. Phase 4: Career Passport + smart share links.

CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,         -- sha256 hex of the raw token; raw token never stored
  label text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  max_views integer CHECK (max_views IS NULL OR max_views > 0),
  view_count integer NOT NULL DEFAULT 0,
  viewer_employer_id uuid REFERENCES public.employers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.share_link_items (
  share_link_id uuid NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('employment','work_history','education','certification','project','referral','credential')),
  item_id uuid NOT NULL,
  PRIMARY KEY (share_link_id, item_type, item_id)
);
GRANT SELECT ON public.share_links, public.share_link_items TO authenticated;
GRANT ALL ON public.share_links, public.share_link_items TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads links" ON public.share_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner reads items" ON public.share_link_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM share_links s WHERE s.id = share_link_id AND s.user_id = auth.uid()));

-- Create: verifies every item belongs to the caller, writes consent in the same transaction.
CREATE OR REPLACE FUNCTION public.create_share_link(_token_hash text, _label text, _expires_at timestamptz,
  _max_views int, _viewer_employer_id uuid, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_id uuid; it jsonb; t text; i uuid; ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_feature_enabled('career_passport') THEN RAISE EXCEPTION 'Feature disabled'; END IF;
  IF _expires_at <= now() OR _expires_at > now() + interval '90 days' THEN RAISE EXCEPTION 'Expiry must be within 90 days'; END IF;
  IF jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 100 THEN RAISE EXCEPTION 'Select 1–100 items'; END IF;
  INSERT INTO share_links(user_id,token_hash,label,expires_at,max_views,viewer_employer_id)
  VALUES (auth.uid(), _token_hash, left(_label,120), _expires_at, _max_views, _viewer_employer_id) RETURNING id INTO link_id;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    t := it->>'type'; i := (it->>'id')::uuid;
    ok := CASE t
      WHEN 'employment'    THEN EXISTS (SELECT 1 FROM employment_records WHERE id=i AND user_id=auth.uid())
      WHEN 'work_history'  THEN EXISTS (SELECT 1 FROM work_history WHERE id=i AND user_id=auth.uid())
      WHEN 'education'     THEN EXISTS (SELECT 1 FROM education_records WHERE id=i AND user_id=auth.uid())
      WHEN 'certification' THEN EXISTS (SELECT 1 FROM certifications WHERE id=i AND user_id=auth.uid())
      WHEN 'project'       THEN EXISTS (SELECT 1 FROM projects WHERE id=i AND user_id=auth.uid())
      WHEN 'referral'      THEN EXISTS (SELECT 1 FROM referral_letters WHERE id=i AND employee_user_id=auth.uid())
      WHEN 'credential'    THEN EXISTS (SELECT 1 FROM credentials c JOIN profiles p ON p.id=c.profile_id WHERE c.id=i AND p.user_id=auth.uid())
      ELSE false END;
    IF NOT ok THEN RAISE EXCEPTION 'Item not yours: % %', t, i; END IF;
    INSERT INTO share_link_items VALUES (link_id, t, i) ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO consent_log(user_id, consent_type, granted) VALUES (auth.uid(), 'share_link', true);
  RETURN link_id;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_share_link(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE share_links SET revoked_at = now() WHERE id=_id AND user_id=auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link not found'; END IF;
  INSERT INTO consent_log(user_id, consent_type, granted) VALUES (auth.uid(), 'share_link', false);
END $$;

-- Viewer read. Atomic: one conditional UPDATE claims a view (expiry/revoke/limit checked together).
-- Called only by the view-shared-passport Edge Function (service_role) which applies rate limits.
CREATE OR REPLACE FUNCTION public.get_shared_passport(_token_hash text, _viewer_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l RECORD; result jsonb;
BEGIN
  IF NOT public.is_feature_enabled('career_passport') THEN RETURN NULL; END IF;
  UPDATE share_links SET view_count = view_count + 1
   WHERE token_hash=_token_hash AND revoked_at IS NULL AND expires_at > now()
     AND (max_views IS NULL OR view_count < max_views)
     AND (viewer_employer_id IS NULL OR EXISTS (
          SELECT 1 FROM employers e WHERE e.id = viewer_employer_id AND e.user_id = _viewer_user_id)
       OR EXISTS (SELECT 1 FROM employer_members m WHERE m.employer_id = viewer_employer_id
                  AND m.user_id = _viewer_user_id AND m.status='active'))
  RETURNING * INTO l;
  IF NOT FOUND THEN RETURN NULL; END IF;  -- same response for missing/expired/revoked/used-up

  SELECT jsonb_build_object(
    'owner', (SELECT jsonb_build_object('first_name',p.first_name,'last_name',p.last_name,'profile_id',p.profile_id)
              FROM profiles p WHERE p.user_id = l.user_id),
    'expires_at', l.expires_at,
    'employment', COALESCE((SELECT jsonb_agg(jsonb_build_object('job_title',r.job_title,'engagement_type',r.engagement_type,
        'start_date',r.start_date,'end_date',r.end_date,'status',r.status,'company',e.company_name,'company_verified',e.is_verified))
      FROM share_link_items s JOIN employment_records r ON r.id=s.item_id JOIN employers e ON e.id=r.employer_id
      WHERE s.share_link_id=l.id AND s.item_type='employment'), '[]'),
    'work_history', COALESCE((SELECT jsonb_agg(jsonb_build_object('role',w.role,'company',w.company_name,
        'start_date',w.start_date,'end_date',w.end_date,'verification_status',w.verification_status))
      FROM share_link_items s JOIN work_history w ON w.id=s.item_id WHERE s.share_link_id=l.id AND s.item_type='work_history'), '[]'),
    'education', COALESCE((SELECT jsonb_agg(jsonb_build_object('institution',x.institution_name,'qualification',x.qualification,
        'start_date',x.start_date,'end_date',x.end_date,'verification_status',x.verification_status))
      FROM share_link_items s JOIN education_records x ON x.id=s.item_id WHERE s.share_link_id=l.id AND s.item_type='education'), '[]'),
    'certifications', COALESCE((SELECT jsonb_agg(jsonb_build_object('name',c.name,'issuer',c.issuer_name,
        'issued_on',c.issued_on,'expires_on',c.expires_on,'verification_status',c.verification_status))
      FROM share_link_items s JOIN certifications c ON c.id=s.item_id WHERE s.share_link_id=l.id AND s.item_type='certification'), '[]'),
    'credentials', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'issued_at',c.issued_at,'revoked',c.revoked_at IS NOT NULL))
      FROM share_link_items s JOIN credentials c ON c.id=s.item_id WHERE s.share_link_id=l.id AND s.item_type='credential'), '[]')
  ) INTO result;
  -- No national ID, passport, email, phone or internal user IDs are ever returned.
  INSERT INTO access_audit_log(subject_user_id, actor_user_id, actor_employer_id, action, target_type, target_id)
  VALUES (l.user_id, _viewer_user_id, l.viewer_employer_id, 'share_view', 'share_link', l.id);
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.create_share_link(text,text,timestamptz,int,uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_share_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_passport(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_share_link(text,text,timestamptz,int,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_share_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_passport(text,uuid) TO service_role;
