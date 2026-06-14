
-- Restrict employees from reading sensitive employer contact fields
-- Drop broad employee policy and replace with column-aware approach via RPCs

REVOKE SELECT (email, phone, address, registration_number) ON public.employers FROM authenticated, anon;

-- Owner can fetch own full employer row
CREATE OR REPLACE FUNCTION public.get_my_employer()
RETURNS SETOF public.employers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.employers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Admin can fetch all employers with full fields
CREATE OR REPLACE FUNCTION public.get_admin_employers()
RETURNS SETOF public.employers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.employers
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_employer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_employers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_employer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_employers() TO authenticated;
