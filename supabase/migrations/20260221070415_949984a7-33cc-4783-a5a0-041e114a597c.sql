-- Allow employees to see basic employer info for their own employment records
CREATE POLICY "Employees can view their employer info"
ON public.employers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employment_records
    WHERE employment_records.employer_id = employers.id
    AND employment_records.user_id = auth.uid()
  )
);