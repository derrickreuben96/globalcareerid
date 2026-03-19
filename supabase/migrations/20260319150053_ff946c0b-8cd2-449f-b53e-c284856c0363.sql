
-- Add profile_image_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view profile images (public bucket)
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- RLS: authenticated users can upload their own profile image
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can update their own profile image
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can delete their own profile image
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
