
-- 1) Restrict duplicate_risk_flags to admins only
DROP POLICY IF EXISTS "Users can view own risk flags" ON public.duplicate_risk_flags;

-- 2) Remove user INSERT on security_events; only service_role/edge functions log events
DROP POLICY IF EXISTS "Users can log their own security events" ON public.security_events;
