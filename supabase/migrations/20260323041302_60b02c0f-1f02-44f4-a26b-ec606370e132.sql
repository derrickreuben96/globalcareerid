
-- GDPR compliance tables

-- Data Export Requests
CREATE TABLE public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'downloaded')),
  download_url text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export requests"
  ON public.data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Deletion Requests
CREATE TABLE public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  reason text,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests"
  ON public.deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deletion requests"
  ON public.deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending deletion requests"
  ON public.deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Consent Log
CREATE TABLE public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'data_processing')),
  granted boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent logs"
  ON public.consent_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent logs"
  ON public.consent_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous inserts for cookie consent before login
CREATE POLICY "Anonymous can insert consent logs"
  ON public.consent_log FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Create the user-exports storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('user-exports', 'user-exports', false);

-- Storage RLS: users can read their own exports
CREATE POLICY "Users can read their own exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-exports' AND (storage.foldername(name))[1] = 'exports' AND (storage.foldername(name))[2] = auth.uid()::text);
