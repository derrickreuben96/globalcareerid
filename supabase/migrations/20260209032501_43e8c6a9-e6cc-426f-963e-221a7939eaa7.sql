-- Add explicit anonymous blocking policies to remaining tables for defense-in-depth

-- Block anonymous access to employers table (all operations)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employers' 
    AND policyname = 'Block anonymous employer access'
  ) THEN
    CREATE POLICY "Block anonymous employer access"
    ON public.employers
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;

-- Block anonymous access to disputes table (ensure it exists for all operations)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'disputes' 
    AND policyname = 'Block anonymous dispute access'
  ) THEN
    CREATE POLICY "Block anonymous dispute access"
    ON public.disputes
    FOR ALL
    TO anon
    USING (false);
  END IF;
END $$;