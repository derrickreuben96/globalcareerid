-- Add country and citizenship fields to profiles table for job seekers
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS citizenship text;

-- Add comments to explain the columns
COMMENT ON COLUMN public.profiles.country IS 'Country where the user currently resides';
COMMENT ON COLUMN public.profiles.citizenship IS 'Country of citizenship';
