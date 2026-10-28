CREATE OR REPLACE FUNCTION public.get_career_employer_identity(employer_ids uuid[])
RETURNS TABLE(id uuid, company_name text, is_verified boolean, logo_url text, country text, website text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT e.id,e.company_name,e.is_verified,e.logo_url,e.country,e.website
 FROM public.employers e
 WHERE e.id = ANY(employer_ids) AND auth.uid() IS NOT NULL AND (
 e.user_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR
 EXISTS (SELECT 1 FROM public.employment_records r WHERE r.employer_id=e.id AND r.user_id=auth.uid()) OR
 EXISTS (SELECT 1 FROM public.referral_letters l WHERE l.employer_id=e.id AND l.employee_user_id=auth.uid())
 );
$$;
REVOKE ALL ON FUNCTION public.get_career_employer_identity(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_career_employer_identity(uuid[]) TO authenticated, service_role;

ALTER TABLE public.work_history ADD COLUMN employment_record_id uuid REFERENCES public.employment_records(id);
CREATE UNIQUE INDEX work_history_employment_record_id_key ON public.work_history(employment_record_id);

WITH matches AS (
 SELECT w.id, r.id AS record_id, row_number() OVER (PARTITION BY r.id ORDER BY w.created_at,w.id) AS match_rank
 FROM public.work_history w JOIN public.employment_records r ON r.user_id=w.user_id
 JOIN public.employers e ON e.id=r.employer_id
 WHERE w.verification_method='employer_record' AND w.company_name=e.company_name AND w.role=r.job_title AND w.start_date=r.start_date
)
UPDATE public.work_history w SET employment_record_id=m.record_id FROM matches m WHERE w.id=m.id AND m.match_rank=1;

INSERT INTO public.work_history(user_id,company_name,role,department,employment_type,start_date,end_date,verification_status,verification_method,employment_record_id)
SELECT r.user_id,e.company_name,r.job_title,r.department,r.employment_type,r.start_date,r.end_date,'employer_verified','employer_record',r.id
FROM public.employment_records r JOIN public.employers e ON e.id=r.employer_id
WHERE NOT EXISTS (SELECT 1 FROM public.work_history w WHERE w.employment_record_id=r.id);

CREATE OR REPLACE FUNCTION public.sync_employment_to_work_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 INSERT INTO public.work_history(user_id,company_name,role,department,employment_type,start_date,end_date,verification_status,verification_method,employment_record_id)
 SELECT NEW.user_id,e.company_name,NEW.job_title,NEW.department,NEW.employment_type,NEW.start_date,NEW.end_date,'employer_verified','employer_record',NEW.id FROM public.employers e WHERE e.id=NEW.employer_id
 ON CONFLICT (employment_record_id) DO UPDATE SET company_name=EXCLUDED.company_name,role=EXCLUDED.role,department=EXCLUDED.department,employment_type=EXCLUDED.employment_type,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,updated_at=now();
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_employer_history_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 UPDATE public.work_history w SET company_name=NEW.company_name,updated_at=now()
 FROM public.employment_records r WHERE w.employment_record_id=r.id AND r.employer_id=NEW.id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER sync_employer_history_name_trigger AFTER UPDATE OF company_name ON public.employers FOR EACH ROW WHEN (OLD.company_name IS DISTINCT FROM NEW.company_name) EXECUTE FUNCTION public.sync_employer_history_name();