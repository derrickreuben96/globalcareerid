-- Create function to generate employer-specific ID with different format (EM-YYYY-XXXXX)
CREATE OR REPLACE FUNCTION public.generate_employer_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    year_part TEXT;
    random_part TEXT;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
    new_id := 'EM-' || year_part || '-' || random_part;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add employer_id column to employers table with unique identifier
ALTER TABLE public.employers 
ADD COLUMN IF NOT EXISTS employer_id TEXT UNIQUE DEFAULT public.generate_employer_id();

-- Update any existing employers that might have NULL employer_id
UPDATE public.employers 
SET employer_id = public.generate_employer_id() 
WHERE employer_id IS NULL;