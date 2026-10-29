CREATE TABLE public.recruitment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
 employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK (event_type IN ('submitted','status_changed','interview_scheduled','current_status')),
 from_status text,
 to_status text NOT NULL,
 interview_at timestamptz,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_events TO authenticated;
GRANT ALL ON public.recruitment_events TO service_role;
ALTER TABLE public.recruitment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read recruitment activity" ON public.recruitment_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND (a.employer_id IN (SELECT id FROM public.get_my_employer()) OR public.has_role(auth.uid(), 'admin'))));
CREATE INDEX recruitment_events_employer_time ON public.recruitment_events(employer_id, occurred_at DESC);
CREATE OR REPLACE FUNCTION public.record_recruitment_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  INSERT INTO public.recruitment_events(application_id, employer_id, event_type, to_status, occurred_at) VALUES (NEW.id, NEW.employer_id, 'submitted', NEW.status, NEW.created_at);
 ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.interview_at IS DISTINCT FROM OLD.interview_at OR NEW.interview_notes IS DISTINCT FROM OLD.interview_notes THEN
  INSERT INTO public.recruitment_events(application_id, employer_id, event_type, from_status, to_status, interview_at) VALUES (NEW.id, NEW.employer_id, CASE WHEN NEW.status = 'interview' THEN 'interview_scheduled' ELSE 'status_changed' END, OLD.status, NEW.status, NEW.interview_at);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_recruitment_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER recruitment_event_after_change AFTER INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.record_recruitment_event();
INSERT INTO public.recruitment_events(application_id, employer_id, event_type, to_status, occurred_at) SELECT id, employer_id, 'submitted', 'submitted', created_at FROM public.applications;
INSERT INTO public.recruitment_events(application_id, employer_id, event_type, to_status, interview_at, occurred_at) SELECT id, employer_id, 'current_status', status, interview_at, updated_at FROM public.applications WHERE status <> 'submitted';
COMMENT ON TABLE public.recruitment_events IS 'Immutable recruitment activity. Existing applications have submitted and current-status baselines only; previous transitions are not inferred.';