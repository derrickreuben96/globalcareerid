ALTER TABLE public.employer_leads
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.employer_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  body text,
  subject text,
  follow_up_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead activities" ON public.lead_activities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can add lead activities" ON public.lead_activities
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update lead activities" ON public.lead_activities
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete lead activities" ON public.lead_activities
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  user_agent text,
  is_bot boolean NOT NULL DEFAULT false,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.page_visits TO anon;
GRANT SELECT, INSERT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a page visit" ON public.page_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read page visits" ON public.page_visits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS page_visits_path_idx ON public.page_visits(path, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_page_visit_stats(days_back integer DEFAULT 30)
RETURNS TABLE(path text, total_visits bigint, human_visits bigint, bot_visits bigint, last_visit timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    pv.path,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE NOT pv.is_bot)::bigint,
    COUNT(*) FILTER (WHERE pv.is_bot)::bigint,
    MAX(pv.created_at)
  FROM public.page_visits pv
  WHERE pv.created_at > now() - (GREATEST(LEAST(days_back, 365), 1) || ' days')::interval
  GROUP BY pv.path
  ORDER BY COUNT(*) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_open_jobs()
RETURNS TABLE(
  id uuid, title text, description text, role_category text, location text,
  application_deadline timestamptz, created_at timestamptz,
  employer_id uuid, company_name text, country text, logo_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.title, j.description, j.role_category, j.location,
         j.application_deadline, j.created_at,
         e.id, e.company_name, e.country, e.logo_url
  FROM public.jobs j
  JOIN public.employers e ON e.id = j.employer_id
  WHERE j.status = 'open'
    AND e.is_verified = true
    AND (j.application_deadline IS NULL OR j.application_deadline > now())
  ORDER BY j.created_at DESC
  LIMIT 200;
$$;