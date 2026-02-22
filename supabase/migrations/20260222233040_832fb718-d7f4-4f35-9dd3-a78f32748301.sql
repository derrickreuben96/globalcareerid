
-- =============================================
-- Retroactive Employment Verification System
-- Additive only — no existing tables modified
-- =============================================

-- 1. Self-declared work history (separate from employer-managed employment_records)
CREATE TABLE public.work_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  employment_type TEXT DEFAULT 'full_time',
  start_date DATE NOT NULL,
  end_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'self_declared',
  verification_method TEXT,
  verification_requested_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_work_history_user_id ON public.work_history(user_id);
CREATE INDEX idx_work_history_verification_status ON public.work_history(verification_status);

-- RLS
ALTER TABLE public.work_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own work history"
  ON public.work_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own work history"
  ON public.work_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unverified work history"
  ON public.work_history FOR UPDATE
  USING (auth.uid() = user_id AND verification_status IN ('self_declared', 'rejected'));

CREATE POLICY "Users can delete their own unverified work history"
  ON public.work_history FOR DELETE
  USING (auth.uid() = user_id AND verification_status IN ('self_declared', 'rejected'));

CREATE POLICY "Admins can manage all work history"
  ON public.work_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Verification requests (token-based employer verification)
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_history_id UUID NOT NULL REFERENCES public.work_history(id) ON DELETE CASCADE,
  employer_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_requests_work_history ON public.verification_requests(work_history_id);
CREATE INDEX idx_verification_requests_token ON public.verification_requests(token);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification requests"
  ON public.verification_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.work_history wh
    WHERE wh.id = verification_requests.work_history_id AND wh.user_id = auth.uid()
  ));

CREATE POLICY "Users can create verification requests for their work history"
  ON public.verification_requests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.work_history wh
    WHERE wh.id = verification_requests.work_history_id AND wh.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all verification requests"
  ON public.verification_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Verification documents (supporting evidence)
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_history_id UUID NOT NULL REFERENCES public.work_history(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_documents_work_history ON public.verification_documents(work_history_id);
CREATE INDEX idx_verification_documents_review_status ON public.verification_documents(review_status);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification documents"
  ON public.verification_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.work_history wh
    WHERE wh.id = verification_documents.work_history_id AND wh.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload documents for their work history"
  ON public.verification_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.work_history wh
    WHERE wh.id = verification_documents.work_history_id AND wh.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all verification documents"
  ON public.verification_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('verification-documents', 'verification-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own verification docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- 5. Updated_at trigger for work_history
CREATE OR REPLACE FUNCTION public.update_work_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_work_history_timestamp
  BEFORE UPDATE ON public.work_history
  FOR EACH ROW EXECUTE FUNCTION public.update_work_history_updated_at();

-- 6. Prevent duplicate records (same user, company, role, start_date)
CREATE UNIQUE INDEX idx_work_history_no_duplicates
  ON public.work_history(user_id, company_name, role, start_date);
