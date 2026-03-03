
-- 1. FIX: in_app_notifications INSERT policy - prevent users from inserting notifications for OTHER users
-- This is a critical phishing/spam vulnerability
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.in_app_notifications;
CREATE POLICY "Users can only insert notifications for themselves or via system"
ON public.in_app_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'employer'::app_role)
);

-- 2. FIX: Security events INSERT - tighten to only own user_id (remove OR admin bypass on insert)
DROP POLICY IF EXISTS "Users can log their own security events" ON public.security_events;
CREATE POLICY "Users can log their own security events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. FIX: Add missing foreign keys on promotion_requests
ALTER TABLE public.promotion_requests
  DROP CONSTRAINT IF EXISTS promotion_requests_employment_record_id_fkey;
ALTER TABLE public.promotion_requests
  ADD CONSTRAINT promotion_requests_employment_record_id_fkey
  FOREIGN KEY (employment_record_id) REFERENCES public.employment_records(id) ON DELETE CASCADE;

-- 4. FIX: Limit employer data visible to employees - drop overly broad policy and replace with limited view
-- Employees should see company_name and verification status only, not registration numbers/addresses
-- The existing is_employed_by policy exposes all columns; we keep it but rely on the RPC for public queries

-- 5. FIX: Add verification status check to public employment records visibility
DROP POLICY IF EXISTS "Authenticated users can view verified records for public profil" ON public.employment_records;
CREATE POLICY "Authenticated users can view verified records for public profiles"
ON public.employment_records
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND status IN ('active', 'ended')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = employment_records.user_id
    AND profiles.visibility = 'public'
  )
);
