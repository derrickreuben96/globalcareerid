CREATE TABLE public.employer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  work_email text NOT NULL,
  phone text,
  country text,
  company_size text,
  monthly_hires integer,
  current_method text,
  message text,
  source text NOT NULL DEFAULT 'demo_page',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.employer_leads TO anon;
GRANT INSERT ON public.employer_leads TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.employer_leads TO authenticated;
GRANT ALL ON public.employer_leads TO service_role;

ALTER TABLE public.employer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an employer lead"
ON public.employer_leads FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(company_name)) BETWEEN 1 AND 200
  AND length(trim(contact_name)) BETWEEN 1 AND 200
  AND length(trim(work_email)) BETWEEN 3 AND 320
  AND work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (message IS NULL OR length(message) <= 4000)
  AND (monthly_hires IS NULL OR (monthly_hires >= 0 AND monthly_hires <= 100000))
  AND status = 'new'
);

CREATE POLICY "Admins can view employer leads"
ON public.employer_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employer leads"
ON public.employer_leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employer leads"
ON public.employer_leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_employer_leads_updated_at
BEFORE UPDATE ON public.employer_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();