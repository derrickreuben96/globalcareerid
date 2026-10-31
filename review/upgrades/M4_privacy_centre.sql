-- REVIEW ONLY — NOT APPLIED. Phase 2: privacy centre. (M3 = per-table RLS swaps, written after M2 tests pass.)

CREATE TABLE public.profile_privacy_settings (
  user_id uuid PRIMARY KEY,
  discoverable boolean NOT NULL DEFAULT false,      -- opt-in to talent search only
  show_in_search_fields jsonb NOT NULL DEFAULT '["skills","experience_level","location"]'::jsonb,
  retention_preference text NOT NULL DEFAULT 'standard' CHECK (retention_preference IN ('standard','minimal')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_privacy_settings TO authenticated;
GRANT ALL ON public.profile_privacy_settings TO service_role;
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own privacy settings" ON public.profile_privacy_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Versioned consent: adds a version column to existing consent_log (nullable, additive).
ALTER TABLE public.consent_log ADD COLUMN IF NOT EXISTS policy_version text;

-- Deletion runner: anonymises personal fields of approved, due requests.
-- Hard-gated by the 'deletion_runner' flag (off). Legal sign-off required before enabling.
CREATE OR REPLACE FUNCTION public.run_due_deletions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n int := 0;
BEGIN
  IF NOT public.is_feature_enabled('deletion_runner') THEN RETURN 0; END IF;
  FOR r IN SELECT * FROM deletion_requests
           WHERE status = 'approved' AND scheduled_for IS NOT NULL AND scheduled_for <= now()
           FOR UPDATE SKIP LOCKED LOOP
    UPDATE profiles SET first_name='Deleted', last_name='User', phone=NULL, location=NULL, bio=NULL,
      national_id=NULL, passport_number=NULL, date_of_birth=NULL, profile_image_url=NULL,
      visibility='private', email = 'deleted+' || r.user_id || '@invalid'
     WHERE user_id = r.user_id;
    DELETE FROM profile_privacy_settings WHERE user_id = r.user_id;
    UPDATE deletion_requests SET status='completed' WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.run_due_deletions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_due_deletions() TO service_role;
