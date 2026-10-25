ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interview_at timestamp with time zone;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interview_notes text;