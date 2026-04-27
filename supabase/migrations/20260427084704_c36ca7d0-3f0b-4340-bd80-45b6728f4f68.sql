-- Fix mismatched storage policy paths for user-exports bucket.
-- Files are stored at: exports/{user_id}/data-*.json
-- Align DELETE policy with SELECT policy.

DROP POLICY IF EXISTS "Users can delete own export files" ON storage.objects;

CREATE POLICY "Users can delete own export files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-exports'
  AND (storage.foldername(name))[1] = 'exports'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);