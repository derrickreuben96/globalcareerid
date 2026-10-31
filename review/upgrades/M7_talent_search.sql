-- REVIEW ONLY — NOT APPLIED. Phase 5: discoverable-only skills search.

CREATE INDEX IF NOT EXISTS profiles_skills_gin ON public.profiles USING gin (skills);

CREATE OR REPLACE FUNCTION public.search_talent(_skills text[] DEFAULT NULL, _experience text DEFAULT NULL,
  _verified_only boolean DEFAULT false, _page int DEFAULT 0)
RETURNS TABLE(profile_id text, first_name text, last_name text, skills text[], experience_level text,
  location text, availability text, verified_record_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE my_employer uuid;
BEGIN
  IF NOT public.is_feature_enabled('talent_search') THEN RETURN; END IF;
  SELECT e.id INTO my_employer FROM employers e
   WHERE e.is_verified AND public.has_org_role(e.id, ARRAY['recruiter','hiring_manager']) LIMIT 1;
  IF my_employer IS NULL THEN RAISE EXCEPTION 'Verified employer membership required' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT p.profile_id, p.first_name, p.last_name, p.skills, p.experience_level, p.location, p.availability,
         (SELECT count(*) FROM employment_records r WHERE r.user_id=p.user_id AND r.status IN ('active','ended'))
  FROM profiles p JOIN profile_privacy_settings s ON s.user_id = p.user_id AND s.discoverable
  WHERE p.account_type = 'career_individual'
    AND (_skills IS NULL OR p.skills && _skills)
    AND (_experience IS NULL OR p.experience_level = _experience)
    AND (NOT _verified_only OR EXISTS (SELECT 1 FROM employment_records r WHERE r.user_id=p.user_id AND r.status IN ('active','ended')))
  ORDER BY p.profile_id            -- deterministic order for stable paging
  LIMIT 50 OFFSET GREATEST(LEAST(_page, 100), 0) * 50;
END $$;
REVOKE ALL ON FUNCTION public.search_talent(text[],text,boolean,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_talent(text[],text,boolean,int) TO authenticated;
