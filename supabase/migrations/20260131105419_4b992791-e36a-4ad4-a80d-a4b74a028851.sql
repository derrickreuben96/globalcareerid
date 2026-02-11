-- Add logo_url column to employers table
ALTER TABLE public.employers
ADD COLUMN logo_url text;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Allow authenticated users to upload to their company folder
CREATE POLICY "Employers can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow employers to update their own logo
CREATE POLICY "Employers can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow employers to delete their own logo
CREATE POLICY "Employers can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to company logos
CREATE POLICY "Company logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');