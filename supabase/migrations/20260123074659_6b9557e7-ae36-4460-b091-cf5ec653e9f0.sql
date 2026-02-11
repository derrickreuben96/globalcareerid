-- Create trigger for employment record notifications (trigger function already exists)
CREATE TRIGGER on_employment_record_change
AFTER INSERT OR UPDATE ON public.employment_records
FOR EACH ROW
EXECUTE FUNCTION public.notify_employment_change();

-- Add new columns to profiles for advanced filtering
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'entry',
ADD COLUMN IF NOT EXISTS availability text DEFAULT 'not_looking';

-- Add check constraint for experience_level
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_experience_level_check 
CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive'));

-- Add check constraint for availability
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_availability_check 
CHECK (availability IN ('not_looking', 'open_to_offers', 'actively_looking'));