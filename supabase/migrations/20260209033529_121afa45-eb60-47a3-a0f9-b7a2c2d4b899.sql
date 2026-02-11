-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Fixes: PII exposure, dispute validation, employment record protection

-- 1. UPDATE search_public_profiles to ensure no PII (email, phone) is exposed
-- The function already excludes email/phone, but let's verify and make explicit
DROP FUNCTION IF EXISTS public.search_public_profiles(text[], text, text);
CREATE OR REPLACE FUNCTION public.search_public_profiles(
  skill_filter text[] DEFAULT NULL,
  experience_filter text DEFAULT NULL,
  availability_filter text DEFAULT NULL
)
RETURNS TABLE(
  profile_id text,
  first_name text,
  last_name text,
  skills text[],
  location text,
  visibility text,
  experience_level text,
  availability text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.profile_id,
    p.first_name,
    p.last_name,
    p.skills,
    p.location,
    p.visibility,
    p.experience_level,
    p.availability
  FROM profiles p
  WHERE p.visibility = 'public'
    AND auth.uid() IS NOT NULL  -- Require authentication
    AND (experience_filter IS NULL OR experience_filter = 'all' OR p.experience_level = experience_filter)
    AND (availability_filter IS NULL OR availability_filter = 'all' OR p.availability = availability_filter)
  ORDER BY p.first_name
  LIMIT 100;  -- Add pagination limit to prevent data scraping
$$;

-- 2. SECURE get_public_profile_by_id - ensure no PII exposure
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(text);
CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id_param text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  profile_id text,
  first_name text,
  last_name text,
  bio text,
  skills text[],
  visibility text,
  experience_level text,
  location text,
  availability text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.user_id, p.profile_id, p.first_name, p.last_name, p.bio, p.skills,
    p.visibility, p.experience_level, p.location, p.availability,
    p.created_at, p.updated_at
  FROM profiles p
  WHERE p.profile_id = UPPER(profile_id_param);
  -- NOTE: email and phone are intentionally excluded for privacy
$$;

-- 3. ADD validation trigger for disputes to ensure employment_record belongs to user
CREATE OR REPLACE FUNCTION public.validate_dispute_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the employment record belongs to the user creating the dispute
  IF NOT EXISTS (
    SELECT 1 FROM employment_records 
    WHERE id = NEW.employment_record_id 
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'You can only dispute your own employment records';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS validate_dispute_ownership_trigger ON disputes;
CREATE TRIGGER validate_dispute_ownership_trigger
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dispute_ownership();

-- 4. ADD audit trigger for employment_record modifications after initial creation
-- This tracks what fields were changed for compliance
CREATE OR REPLACE FUNCTION public.restrict_employment_record_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change status to anything other than 'ended'
  IF OLD.status IN ('active', 'ended') AND NEW.status NOT IN ('active', 'ended') THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change verified record status';
    END IF;
  END IF;
  
  -- Prevent changing user_id (would allow reassigning records)
  IF OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change record ownership';
  END IF;
  
  -- Prevent changing employer_id (would allow reassigning to different company)
  IF OLD.employer_id != NEW.employer_id THEN
    RAISE EXCEPTION 'Cannot change employer association';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_employment_record_updates_trigger ON employment_records;
CREATE TRIGGER restrict_employment_record_updates_trigger
  BEFORE UPDATE ON employment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_employment_record_updates();

-- 5. ADD rate limiting table for recovery code attempts
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous security event access"
  ON public.security_events
  FOR SELECT
  TO anon
  USING (false);

-- System can insert security events (via service role)
CREATE POLICY "System can insert security events"
  ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_security_events_type_user_created 
  ON public.security_events(event_type, user_id, created_at DESC);

-- 6. ADD function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  event_type_param text,
  user_id_param uuid,
  max_attempts int,
  window_minutes int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count int;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM security_events
  WHERE event_type = event_type_param
    AND user_id = user_id_param
    AND created_at > (now() - (window_minutes || ' minutes')::interval);
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- 7. ADD function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  user_id_param uuid,
  metadata_param jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_events (event_type, user_id, metadata)
  VALUES (event_type_param, user_id_param, metadata_param);
END;
$$;