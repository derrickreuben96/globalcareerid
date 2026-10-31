-- REVIEW ONLY — NOT APPLIED. Phase 6: interview scheduling.

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.employers(id),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  timezone text NOT NULL,                 -- IANA name of the interviewer, display only
  location_or_link text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','rescheduled','cancelled','completed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start)
);
CREATE TABLE public.interview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_id, reviewer_id)
);
CREATE TABLE public.candidate_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  slot_start timestamptz NOT NULL, slot_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (slot_end > slot_start)
);
CREATE TABLE public.interview_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  offset_minutes int NOT NULL,
  send_at timestamptz NOT NULL,
  sent_at timestamptz,
  UNIQUE (interview_id, offset_minutes)   -- never send the same reminder twice
);
GRANT SELECT ON public.interviews, public.interview_feedback, public.candidate_availability TO authenticated;
GRANT INSERT, DELETE ON public.candidate_availability TO authenticated;
GRANT INSERT, UPDATE ON public.interview_feedback TO authenticated;
GRANT ALL ON public.interviews, public.interview_feedback, public.candidate_availability, public.interview_reminders TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members and candidate read interviews" ON public.interviews FOR SELECT TO authenticated
  USING (public.has_org_role(employer_id, ARRAY['recruiter','hiring_manager'])
      OR EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND a.applicant_user_id = auth.uid()));
-- Feedback: members only, never the candidate.
CREATE POLICY "members read feedback" ON public.interview_feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM interviews i WHERE i.id = interview_id AND public.has_org_role(i.employer_id, ARRAY['recruiter','hiring_manager'])));
CREATE POLICY "members write own feedback" ON public.interview_feedback FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM interviews i WHERE i.id = interview_id AND public.has_org_role(i.employer_id, ARRAY['recruiter','hiring_manager'])));
CREATE POLICY "members update own feedback" ON public.interview_feedback FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "candidate manages availability" ON public.candidate_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND (a.applicant_user_id = auth.uid() OR public.has_org_role(a.employer_id, ARRAY['recruiter']))))
  WITH CHECK (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND a.applicant_user_id = auth.uid()));

-- Schedule/reschedule/cancel in one transaction; keeps applications.interview_at in step
-- so existing screens and the recruitment_events trigger keep working.
CREATE OR REPLACE FUNCTION public.schedule_interview(_application_id uuid, _start timestamptz, _end timestamptz,
  _timezone text, _location text, _interview_id uuid DEFAULT NULL, _cancel boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app RECORD; iid uuid;
BEGIN
  IF NOT public.is_feature_enabled('interview_scheduling') THEN RAISE EXCEPTION 'Feature disabled'; END IF;
  SELECT * INTO app FROM applications WHERE id=_application_id FOR UPDATE;
  IF NOT FOUND OR NOT public.has_org_role(app.employer_id, ARRAY['recruiter']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=_timezone) THEN RAISE EXCEPTION 'Unknown timezone'; END IF;
  IF _interview_id IS NULL THEN
    INSERT INTO interviews(application_id,employer_id,scheduled_start,scheduled_end,timezone,location_or_link,created_by)
    VALUES (_application_id, app.employer_id, _start, _end, _timezone, left(_location,500), auth.uid()) RETURNING id INTO iid;
  ELSE
    UPDATE interviews SET scheduled_start=_start, scheduled_end=_end, timezone=_timezone, location_or_link=left(_location,500),
      status = CASE WHEN _cancel THEN 'cancelled' ELSE 'rescheduled' END, updated_at=now()
     WHERE id=_interview_id AND application_id=_application_id RETURNING id INTO iid;
    IF iid IS NULL THEN RAISE EXCEPTION 'Interview not found'; END IF;
    DELETE FROM interview_reminders WHERE interview_id=iid AND sent_at IS NULL;
  END IF;
  IF NOT _cancel THEN
    INSERT INTO interview_reminders(interview_id, offset_minutes, send_at)
    SELECT iid, o, _start - make_interval(mins => o) FROM unnest(ARRAY[1440, 60]) o
    WHERE _start - make_interval(mins => o) > now()
    ON CONFLICT (interview_id, offset_minutes) DO UPDATE SET send_at=EXCLUDED.send_at, sent_at=NULL;
    UPDATE applications SET interview_at=_start, status='interview' WHERE id=_application_id;
  ELSE
    UPDATE applications SET interview_at=NULL WHERE id=_application_id;
  END IF;
  RETURN iid;
END $$;
REVOKE ALL ON FUNCTION public.schedule_interview(uuid,timestamptz,timestamptz,text,text,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_interview(uuid,timestamptz,timestamptz,text,text,uuid,boolean) TO authenticated;

-- Reminder sender claims due rows atomically (prevents double sends across runs).
CREATE OR REPLACE FUNCTION public.claim_due_interview_reminders(_limit int DEFAULT 100)
RETURNS SETOF public.interview_reminders LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE interview_reminders r SET sent_at = now()
  WHERE r.id IN (SELECT r2.id FROM interview_reminders r2 JOIN interviews i ON i.id=r2.interview_id
                 WHERE r2.sent_at IS NULL AND r2.send_at <= now() AND i.status IN ('scheduled','rescheduled')
                 ORDER BY r2.send_at LIMIT _limit FOR UPDATE SKIP LOCKED)
  RETURNING r.*
$$;
REVOKE ALL ON FUNCTION public.claim_due_interview_reminders(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_interview_reminders(int) TO service_role;
