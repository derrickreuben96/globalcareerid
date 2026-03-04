
-- Add verification_number column to referral_letters
ALTER TABLE public.referral_letters ADD COLUMN IF NOT EXISTS verification_number text UNIQUE;

-- Function to generate unique verification number like RL-2026-XXXXX
CREATE OR REPLACE FUNCTION public.generate_referral_verification_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_num TEXT;
  year_part TEXT;
  random_part TEXT;
  exists_already BOOLEAN;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  LOOP
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    new_num := 'RL-' || year_part || '-' || random_part;
    SELECT EXISTS(SELECT 1 FROM referral_letters WHERE verification_number = new_num) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_num;
END;
$$;

-- Set default for new rows
ALTER TABLE public.referral_letters ALTER COLUMN verification_number SET DEFAULT generate_referral_verification_number();

-- Backfill existing rows that don't have a verification number
UPDATE public.referral_letters SET verification_number = generate_referral_verification_number() WHERE verification_number IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.referral_letters ALTER COLUMN verification_number SET NOT NULL;

-- Create a security definer function for employers to verify a referral letter number
CREATE OR REPLACE FUNCTION public.verify_referral_letter(verification_num text)
RETURNS TABLE(
  is_valid boolean,
  company_name text,
  employee_name text,
  job_title text,
  issued_date timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    true AS is_valid,
    e.company_name,
    p.first_name || ' ' || p.last_name AS employee_name,
    er.job_title,
    rl.created_at AS issued_date
  FROM referral_letters rl
  JOIN employers e ON e.id = rl.employer_id
  JOIN employment_records er ON er.id = rl.employment_record_id
  JOIN profiles p ON p.user_id = rl.employee_user_id
  WHERE rl.verification_number = UPPER(TRIM(verification_num))
  LIMIT 1;
$$;
