-- 1) Strengthen employment_records INSERT policy:
--    require verified employer owned by current user AND target profile exists.
DROP POLICY IF EXISTS "Employers can insert employment records" ON public.employment_records;
CREATE POLICY "Employers can insert employment records"
  ON public.employment_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employers e
      WHERE e.id = employment_records.employer_id
        AND e.user_id = auth.uid()
        AND e.is_verified = true
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = employment_records.user_id
    )
  );

-- 2) Strengthen employment_records UPDATE policy:
--    require employer to STILL be verified when updating (e.g. ending employment).
DROP POLICY IF EXISTS "Employers can update their employment records" ON public.employment_records;
CREATE POLICY "Employers can update their employment records"
  ON public.employment_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employers e
      WHERE e.id = employment_records.employer_id
        AND e.user_id = auth.uid()
        AND e.is_verified = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employers e
      WHERE e.id = employment_records.employer_id
        AND e.user_id = auth.uid()
        AND e.is_verified = true
    )
  );

-- 3) Admin-only paginated/filterable consent log reader (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.get_consent_logs_admin(
  search_term text DEFAULT NULL,
  consent_type_filter text DEFAULT NULL,
  granted_filter boolean DEFAULT NULL,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  result_limit int DEFAULT 500,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  consent_type text,
  granted boolean,
  ip_address text,
  user_agent text,
  created_at timestamptz,
  user_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    cl.id,
    cl.user_id,
    cl.consent_type,
    cl.granted,
    cl.ip_address,
    cl.user_agent,
    cl.created_at,
    p.email AS user_email
  FROM public.consent_log cl
  LEFT JOIN public.profiles p ON p.user_id = cl.user_id
  WHERE
    (consent_type_filter IS NULL OR cl.consent_type = consent_type_filter)
    AND (granted_filter IS NULL OR cl.granted = granted_filter)
    AND (start_date IS NULL OR cl.created_at >= start_date)
    AND (end_date IS NULL OR cl.created_at <= end_date)
    AND (
      search_term IS NULL
      OR cl.ip_address ILIKE '%' || search_term || '%'
      OR cl.user_agent ILIKE '%' || search_term || '%'
      OR cl.consent_type ILIKE '%' || search_term || '%'
      OR p.email ILIKE '%' || search_term || '%'
    )
  ORDER BY cl.created_at DESC
  LIMIT GREATEST(LEAST(result_limit, 5000), 1)
  OFFSET GREATEST(result_offset, 0);
END;
$$;