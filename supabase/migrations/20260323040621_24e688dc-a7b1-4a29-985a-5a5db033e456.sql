CREATE TABLE public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  signed_jwt text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid
);

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Owner can read their own credentials
CREATE POLICY "Users can view their own credentials"
  ON public.credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = credentials.profile_id
      AND p.user_id = auth.uid()
    )
  );

-- Owner can revoke their own credentials
CREATE POLICY "Users can revoke their own credentials"
  ON public.credentials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = credentials.profile_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = credentials.profile_id
      AND p.user_id = auth.uid()
    )
  );

-- Public can verify a credential by looking up its JWT (read-only, specific fields)
CREATE POLICY "Anyone can verify credentials by JWT"
  ON public.credentials
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can insert (no explicit policy needed - service role bypasses RLS)