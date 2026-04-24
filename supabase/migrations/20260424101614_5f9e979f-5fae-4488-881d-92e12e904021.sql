-- 1) Hash verification tokens at rest
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS token_hash text;

-- Backfill: hash existing tokens (sha256 hex) using pgcrypto if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    UPDATE public.verification_requests
       SET token_hash = encode(digest(token, 'sha256'), 'hex')
     WHERE token_hash IS NULL AND token IS NOT NULL;
  END IF;
END$$;

-- Now make token_hash required and unique, drop the plaintext column
ALTER TABLE public.verification_requests
  ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_token_hash_key
  ON public.verification_requests (token_hash);

ALTER TABLE public.verification_requests
  DROP COLUMN IF EXISTS token;

-- 2) Allow users to delete their own data export files from storage
DROP POLICY IF EXISTS "Users can delete own export files" ON storage.objects;
CREATE POLICY "Users can delete own export files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3) Admin SELECT policy on consent_log for compliance audit
DROP POLICY IF EXISTS "Admins can view all consent logs" ON public.consent_log;
CREATE POLICY "Admins can view all consent logs"
  ON public.consent_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Let users view duplicate risk flags about their own profile (read-only)
DROP POLICY IF EXISTS "Users can view own risk flags" ON public.duplicate_risk_flags;
CREATE POLICY "Users can view own risk flags"
  ON public.duplicate_risk_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = duplicate_risk_flags.profile_id
        AND p.user_id = auth.uid()
    )
  );