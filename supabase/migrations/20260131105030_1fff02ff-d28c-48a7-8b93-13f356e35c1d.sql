-- Add phone and address columns to employers table
ALTER TABLE public.employers
ADD COLUMN phone text,
ADD COLUMN address text;