-- Revert profile-images bucket to public to preserve existing flows that rely on
-- getPublicUrl() (Dashboard, header, talent search, etc.). Write restrictions remain in place.
UPDATE storage.buckets SET public = true WHERE id = 'profile-images';

DROP POLICY IF EXISTS "Authenticated users can view profile images" ON storage.objects;

CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-images');