-- Create a function for users to view their own disputes WITHOUT admin_notes
CREATE OR REPLACE FUNCTION public.get_user_disputes(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  employment_record_id uuid,
  user_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.employment_record_id,
    d.user_id,
    d.reason,
    d.status,
    d.created_at,
    d.updated_at,
    d.resolved_at
  FROM disputes d
  WHERE d.user_id = target_user_id AND auth.uid() = target_user_id;
$$;

-- Create a function for admins to view all disputes WITH admin_notes
CREATE OR REPLACE FUNCTION public.get_admin_disputes()
RETURNS TABLE(
  id uuid,
  employment_record_id uuid,
  user_id uuid,
  reason text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.employment_record_id,
    d.user_id,
    d.reason,
    d.status,
    d.admin_notes,
    d.created_at,
    d.updated_at,
    d.resolved_at,
    d.resolved_by
  FROM disputes d
  WHERE has_role(auth.uid(), 'admin'::app_role)
  ORDER BY d.created_at DESC;
$$;

-- Drop existing user SELECT policy on disputes
DROP POLICY IF EXISTS "Users can view their own disputes" ON public.disputes;

-- Create new restrictive SELECT policy that forces function access for users
CREATE POLICY "Users require function access for disputes"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);