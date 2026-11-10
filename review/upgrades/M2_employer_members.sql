-- REVIEW ONLY — NOT APPLIED (backend paused: out of Cloud credits).
-- Phase 1: employer team accounts.
-- Existing RLS on jobs/applications/employment_records is NOT rewritten here;
-- M3 (per table group, one migration each, after tests) swaps owner checks for has_org_role.

CREATE TYPE public.org_member_role AS ENUM ('org_admin','recruiter','hiring_manager','verification_officer');

CREATE TABLE public.employer_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role public.org_member_role NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, user_id)
);
GRANT SELECT ON public.employer_members TO authenticated;
GRANT ALL ON public.employer_members TO service_role;
ALTER TABLE public.employer_members ENABLE ROW LEVEL SECURITY;
-- Writes only via SECURITY DEFINER functions below.

CREATE TABLE public.employer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  email_lower text NOT NULL,
  member_role public.org_member_role NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.employer_invitations TO authenticated;
GRANT ALL ON public.employer_invitations TO service_role;
ALTER TABLE public.employer_invitations ENABLE ROW LEVEL SECURITY;

-- Owners become org_admin (copy of an existing relationship). Re-runnable.
INSERT INTO public.employer_members (employer_id, user_id, member_role, invited_by)
SELECT e.id, e.user_id, 'org_admin', e.user_id FROM public.employers e
ON CONFLICT (employer_id, user_id) DO NOTHING;

-- v2 helper: owner OR active member with one of the roles (org_admin implies all).
CREATE OR REPLACE FUNCTION public.has_org_role(_employer_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employers e WHERE e.id = _employer_id AND e.user_id = auth.uid())
      OR (public.is_feature_enabled('employer_members') AND EXISTS (
          SELECT 1 FROM public.employer_members m
          WHERE m.employer_id = _employer_id AND m.user_id = auth.uid() AND m.status = 'active'
            AND (m.member_role = 'org_admin' OR m.member_role::text = ANY(_roles))))
$$;

CREATE POLICY "members see own org roster" ON public.employer_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_role(employer_id, ARRAY['org_admin']));
CREATE POLICY "org admins see invitations" ON public.employer_invitations FOR SELECT TO authenticated
  USING (public.has_org_role(employer_id, ARRAY['org_admin']));

-- Called by an Edge Function that generates the raw token, emails it, and passes only the hash.
CREATE OR REPLACE FUNCTION public.create_employer_invitation(_employer_id uuid, _email text,
  _role public.org_member_role, _token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_feature_enabled('employer_members') THEN RAISE EXCEPTION 'Feature disabled'; END IF;
  IF NOT public.has_org_role(_employer_id, ARRAY['org_admin']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  INSERT INTO employer_invitations(employer_id,email_lower,member_role,token_hash,expires_at,invited_by)
  VALUES (_employer_id, lower(trim(_email)), _role, _token_hash, now() + interval '7 days', auth.uid())
  RETURNING id INTO new_id;
  PERFORM write_access_audit(NULL, _employer_id, 'member_invited', 'employer_invitation', new_id, jsonb_build_object('role', _role));
  RETURN new_id;
END $$;

-- Single use, unexpired, and bound to the signed-in user's email.
CREATE OR REPLACE FUNCTION public.accept_employer_invitation(_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD; caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT lower(email) INTO caller_email FROM auth.users WHERE id = auth.uid();
  UPDATE employer_invitations SET accepted_at = now()
   WHERE token_hash = _token_hash AND accepted_at IS NULL AND revoked_at IS NULL
     AND expires_at > now() AND email_lower = caller_email
  RETURNING * INTO inv;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation invalid, expired or already used'; END IF;
  INSERT INTO employer_members(employer_id,user_id,member_role,invited_by)
  VALUES (inv.employer_id, auth.uid(), inv.member_role, inv.invited_by)
  ON CONFLICT (employer_id,user_id) DO UPDATE SET member_role=EXCLUDED.member_role, status='active', updated_at=now();
  PERFORM write_access_audit(NULL, inv.employer_id, 'member_joined', 'employer_member', auth.uid(), NULL);
  RETURN inv.employer_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_employer_member(_employer_id uuid, _user_id uuid,
  _role public.org_member_role, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_org_role(_employer_id, ARRAY['org_admin']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('active','removed') THEN RAISE EXCEPTION 'Bad status'; END IF;
  IF EXISTS (SELECT 1 FROM employers WHERE id=_employer_id AND user_id=_user_id) THEN
    RAISE EXCEPTION 'The account owner cannot be changed here'; END IF;
  UPDATE employer_members SET member_role=_role, status=_status, updated_at=now()
   WHERE employer_id=_employer_id AND user_id=_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  PERFORM write_access_audit(NULL, _employer_id, 'member_changed', 'employer_member', _user_id,
    jsonb_build_object('role',_role,'status',_status));
END $$;

REVOKE ALL ON FUNCTION public.create_employer_invitation(uuid,text,public.org_member_role,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_employer_invitation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_employer_member(uuid,uuid,public.org_member_role,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_employer_invitation(uuid,text,public.org_member_role,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_employer_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_employer_member(uuid,uuid,public.org_member_role,text) TO authenticated;

-- Team screen helpers.
CREATE OR REPLACE FUNCTION public.get_employer_team(_employer_id uuid)
RETURNS TABLE(user_id uuid, member_role public.org_member_role, status text, first_name text, last_name text, email text, is_owner boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_org_role(_employer_id, ARRAY['org_admin']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT m.user_id, m.member_role, m.status, p.first_name, p.last_name, u.email::text,
         (e.user_id = m.user_id), m.created_at
  FROM employer_members m
  JOIN employers e ON e.id = m.employer_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.employer_id = _employer_id
  ORDER BY (e.user_id = m.user_id) DESC, m.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_employer_invitation(_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE emp uuid;
BEGIN
  SELECT employer_id INTO emp FROM employer_invitations WHERE id = _invitation_id;
  IF emp IS NULL OR NOT public.has_org_role(emp, ARRAY['org_admin']) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  UPDATE employer_invitations SET revoked_at = now()
   WHERE id = _invitation_id AND accepted_at IS NULL AND revoked_at IS NULL;
  PERFORM write_access_audit(NULL, emp, 'member_invite_revoked', 'employer_invitation', _invitation_id, NULL);
END $$;

-- Lets the join page show which company invited you, without revealing anything else.
CREATE OR REPLACE FUNCTION public.preview_employer_invitation(_token_hash text)
RETURNS TABLE(company_name text, member_role public.org_member_role, email_matches boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.company_name, i.member_role,
         i.email_lower = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())
  FROM employer_invitations i JOIN employers e ON e.id = i.employer_id
  WHERE i.token_hash = _token_hash AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
$$;

REVOKE ALL ON FUNCTION public.get_employer_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_employer_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.preview_employer_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employer_team(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_employer_invitation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_employer_invitation(text) TO authenticated, service_role;

-- Owners get team rosters automatically for employers created later.
CREATE OR REPLACE FUNCTION public.add_employer_owner_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO employer_members(employer_id,user_id,member_role,invited_by)
  VALUES (NEW.id, NEW.user_id, 'org_admin', NEW.user_id)
  ON CONFLICT (employer_id,user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.add_employer_owner_member() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER employers_add_owner_member AFTER INSERT ON public.employers
  FOR EACH ROW EXECUTE FUNCTION public.add_employer_owner_member();

UPDATE public.feature_flags SET enabled = true, updated_at = now() WHERE key = 'employer_members';
