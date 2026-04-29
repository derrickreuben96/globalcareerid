-- 1) Privilege escalation fix: explicitly restrict who can INSERT/UPDATE/DELETE on user_roles via RLS.
-- The handle_new_user() trigger runs as SECURITY DEFINER and bypasses RLS, so default role
-- assignment at signup continues to work. Admin self-management still works via the existing
-- "Admins can manage all roles" ALL policy.

-- Block any client-side INSERT into user_roles (only SECURITY DEFINER functions / service role
-- and admins via the existing ALL policy can add rows).
CREATE POLICY "Block client role insert"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Block client role update"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Block client role delete"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Belt-and-suspenders: hard-block role escalation at the row level, even if a future
-- policy is added by mistake. The trigger runs with elevated rights so we must allow
-- service_role / SECURITY DEFINER paths.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow the system trigger / service role / admins to assign roles.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Disallow any client (incl. authenticated users) from ever assigning the admin role.
  IF NEW.role = 'admin'::public.app_role
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized to assign admin role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 2) Allow users to SELECT their own verification_requests (currently only admins can)
CREATE POLICY "Users can view their verification requests"
  ON public.verification_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_history wh
      WHERE wh.id = verification_requests.work_history_id
        AND wh.user_id = auth.uid()
    )
  );

-- 3) Lock down profile-images storage bucket: require authentication to read,
-- and only allow the owning user to write to their own folder.
UPDATE storage.buckets SET public = false WHERE id = 'profile-images';

-- Drop any existing broad policies on profile-images
DROP POLICY IF EXISTS "Public profile images are accessible" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;

CREATE POLICY "Authenticated users can view profile images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile image"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );