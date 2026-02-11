-- Create recovery codes table for 2FA backup
CREATE TABLE public.recovery_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own recovery codes (to see which are used)
CREATE POLICY "Users can view their own recovery codes"
ON public.recovery_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own recovery codes
CREATE POLICY "Users can insert their own recovery codes"
ON public.recovery_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own recovery codes (mark as used)
CREATE POLICY "Users can update their own recovery codes"
ON public.recovery_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own recovery codes (regenerate)
CREATE POLICY "Users can delete their own recovery codes"
ON public.recovery_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Block anonymous access
CREATE POLICY "Block anonymous access"
ON public.recovery_codes
FOR SELECT
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_recovery_codes_user_id ON public.recovery_codes(user_id);

-- Function to verify recovery code (SECURITY DEFINER to bypass RLS during login)
CREATE OR REPLACE FUNCTION public.verify_recovery_code(
    target_user_id UUID,
    input_code_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_found BOOLEAN;
BEGIN
    -- Check if unused code exists and mark as used
    UPDATE recovery_codes
    SET used_at = now()
    WHERE user_id = target_user_id
      AND code_hash = input_code_hash
      AND used_at IS NULL
    RETURNING true INTO code_found;
    
    RETURN COALESCE(code_found, false);
END;
$$;