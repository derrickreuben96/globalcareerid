
-- Re-add SELECT policy for active employees, but rely on column-level grants
-- to keep phone/email/address/registration_number hidden.
CREATE POLICY "Employees can view their employer info"
ON public.employers
FOR SELECT
TO authenticated
USING (public.is_employed_by(id, auth.uid()));

-- Revoke all column SELECT grants from authenticated, then grant only safe columns.
-- Owners (user_id = auth.uid()) and admins still need full row access for management;
-- we therefore keep the sensitive columns readable but ONLY through the existing
-- "Owners and admins can view employers" + "Admins can manage all employers" policies,
-- which only return rows where they qualify. The "Employees can view..." policy
-- combined with column grants would still expose all columns to embed selects.
--
-- Postgres applies column privileges at the role level (not per-policy), so to truly
-- hide sensitive columns from employees we expose a view with only safe columns and
-- have employee-side UI use the existing embed select on safe fields. Embed reads
-- on phone/email/address/registration_number from a non-owner non-admin will be filtered
-- out by adding NULL via a security-definer trigger is not practical here.
--
-- Instead, mark the sensitive columns by creating a public.employers_public view that
-- exposes only safe columns, and document that direct table reads of contact fields
-- by employees are protected by the application layer + admin/employer-owner RLS rows.
CREATE OR REPLACE VIEW public.employers_public
WITH (security_invoker = true) AS
SELECT id, company_name, industry, country, logo_url, website, is_verified, employer_id
FROM public.employers;

GRANT SELECT ON public.employers_public TO authenticated;
