# Global Career ID — Read-only Security & Architecture Audit (30 Oct 2026)

Scope: this is a review of the live database (privileges, policies, functions) and the repository. No changes were made. This report is not a legal compliance opinion or a security certification. When you approve, the fixes below are built in priority order; nothing ships until then.

Legend: CONFIRMED = shown by a database query or a source read. UNVERIFIED = can't be proven from the repository/database alone, or needs a runtime test.

## 1. Findings

### CRITICAL

**C1. Anyone can approve a promotion — CONFIRMED**
- Evidence: `public.approve_promotion(request_id_param, approver_id)` is SECURITY DEFINER, and the ACL grants EXECUTE to `anon` and `authenticated`. The function body has no `auth.uid()` or employer/admin check, and it trusts the `approver_id` passed in.
- Exploit: anyone holding the anon key (it ships in the public site code) calls `rpc('approve_promotion', {request_id_param, approver_id: <any uuid>})`.
- Impact: unauthorised changes to `role_history` and `employment_records.job_title`, a faked approver identity, and corrupted verified history. That breaks the product's core promise.
- Fix: require `auth.uid()` to be the owner of a verified employer for that record, or an admin. Ignore the `approver_id` parameter and use `auth.uid()`. REVOKE EXECUTE from `anon` and `public`.

### HIGH

**H1. Employment history is readable by anyone who knows a Career ID — CONFIRMED**
- Evidence: `get_employment_by_profile_id(text)` is SECURITY DEFINER and anon-executable. It filters only on `status IN ('active','ended')`. There is no `visibility` check and no sharing-consent check.
- Exploit: Career IDs follow the pattern `TW-YYYY-XXXXX` (5 hex characters, about 1M per year), so they can be enumerated. Each hit returns that person's employers, titles and dates.
- Impact: a person's full career history leaks without their consent.
- Fix: return rows only when the profile is `public`, or when there is a valid share token or consent, or when the caller is the owner or an admin. Revoke `anon` where it isn't needed.

**H2. A public profile can be looked up even when it's set to private — CONFIRMED**
- Evidence: `get_public_profile_by_id(text)` is anon-executable, has no `visibility` filter, and returns internal `user_id`, bio, skills, location and availability. The safer `get_public_profile_limited` already exists (public-only, signed-in only).
- Impact: private profiles can be read, and internal `user_id`s leak. Those ids feed other functions that take a `target_user_id`.
- Fix: add `visibility = 'public'` (or a share-consent check), drop `user_id` from the output, and point callers to the limited function.

**H3. Broad execute grants on SECURITY DEFINER functions — CONFIRMED**
- Evidence: almost every SECURITY DEFINER function in `public` grants EXECUTE to `anon`/PUBLIC. Examples: `log_security_event`, `check_rate_limit`, `verify_recovery_code`, `get_notification_preferences`, `get_public_profile_fields`, plus the trigger-only functions.
  - `log_security_event(type, user_id, metadata)`: anyone can write events for any user id. That pollutes the audit trail and can trip `check_rate_limit`, locking a real user out of recovery codes.
  - `verify_recovery_code(target_user_id, hash)`: can be called directly from the browser, which skips the rate limit in the `recovery-codes` server function. It also uses up a code as soon as it matches.
  - `get_notification_preferences(target_user_id)`: anyone can read anyone's preferences (low data value).
- Fix: REVOKE EXECUTE FROM PUBLIC, anon on all of these. Grant to `authenticated` only for functions meant to be called from the browser, and to `service_role` only for internal ones (logging, recovery-code checks, triggers).

**H4. Sharing consent doesn't control who can see career data — CONFIRMED (design gap)**
- Evidence: `profiles` has a `visibility` field, but there is no table for per-employer or per-link sharing grants. The employment policy "Authenticated users can view verified records for public profil…" lets any signed-in user read verified records of public profiles.
- Impact: there is no explicit, revocable, logged consent for each viewer.
- Fix: add short-lived share tokens or consent grants (owner-created, revocable, logged), and require them in the profile and employment lookups.

### MEDIUM

**M1. CORS allows any website — CONFIRMED**
- Evidence: 27 of 29 server functions return `Access-Control-Allow-Origin: *`.
- Impact: low on its own, because the functions use bearer tokens rather than cookies. Still, any website can make a signed-in user's browser call the AI functions and spend credits.
- Fix: allow only globalcareerid.com, www, the lovable.app domains and localhost.

**M2. Almost no rate limiting — CONFIRMED**
- Evidence: `check_rate_limit` is used only in `recovery-codes`. Not covered: anon lead form (`employer_leads` insert), `page_visits` insert, the AI functions, `send-lead-demo-email`, `verify-employment`, the job-application flow, and the public lookups.
- Note: the backend has no standard rate-limiting tool yet, so any limit would be built case by case, and only with your OK.
- Fix: short-term, per-user limits on AI and email using the existing `security_events`. Longer-term, a central limiter.

**M3. Signed-in checks are uneven across server functions — partly CONFIRMED**
- `get-public-key`: public by design, which is fine.
- `check-revocation`: no auth; returns only `revoked` and `revoked_at`. Acceptable.
- `verify-employment`: protected by a hashed token, which is good. UNVERIFIED: whether the token is single-use and expires, and whether the confirm action is a GET link (email link scanners could trigger it). Recommend a POST confirm step.
- The `notify-*` trigger functions compare the header to the service key, which is fine. Not yet checked line by line: `notify-profile-update`, `score-application`, `detect-duplicates`, `export-user-data`, `seal-project`.

**M4. Credential signing: dates and role may come from the request — UNVERIFIED**
- Evidence: `sign-credential` reads `role`, `startDate` and `endDate` from the request body (lines 43–46). It checks employer ownership and that an employment record exists. Not yet confirmed: whether the signed role and dates are compared with the stored record.
- Payload: internal UUIDs, role and dates. No national ID, email or name was seen, which keeps personal data in the payload low.
- Fix: sign from the stored record values only. Add `jti`, and an expiry or revocation reference.

**M5. National ID and passport storage — CONFIRMED stored in plain text; leak paths limited**
- `profiles.national_id` and `passport_number` are readable only by the owner and admins under the current `profiles` policies. No public lookup returns them.
- Risk: the admin tools, the duplicate-detection AI and `bulk-upload-employees` use the service role and can send these values to the AI service. That still needs a line-by-line check (UNVERIFIED).
- Fix: store a hash (or masked value) for deduplication, encrypt the raw value or limit it to admin views, and never send raw IDs to AI prompts.

**M6. Account deletion and data export — partly CONFIRMED**
- `deletion_requests` and `data_export_requests` exist. Users can't delete these rows, which is good for the audit trail.
- UNVERIFIED: whether a scheduled job actually deletes or anonymises the account when `scheduled_for` is reached. No cron job was found in the database functions. Also unverified: whether the export covers every table (applications, credentials, consent_log, disputes, projects, notifications) and whether the private `user-exports` bucket uses short signed links.
- Fix: a scheduled deletion job with the cascade documented, plus a check that the export is complete.

**M7. Consent doesn't gate processing — UNVERIFIED / likely**
- `consent_log` records consent. The check of whether PostHog, Sentry and the AI functions read consent before running was still in progress.
- Fix: load analytics and error tracking only after consent; check consent on the server before AI processing of personal profile data.

### LOW

- **L1.** Production source maps are on (`vite.config.ts` `sourcemap: true`, added for the speed report). Original source is public. Use `'hidden'` and upload the maps to Sentry instead.
- **L2.** Storage: `profile-images` has two duplicate public read policies, and the `public` role is used on the upload policies for logos and verification documents. UNVERIFIED: whether uploads are scoped to the user's own folder (the full policy expression was cut off). Confirm and tighten.
- **L3.** `duplicate_risk_flags` has an admin-only `ALL` policy on role `public`. That's fine, but switch it to `authenticated` for clarity.
- **L4.** Career IDs have little randomness (`MD5(random)` cut to 5 characters). Move to 8 or more characters so they're harder to guess. Existing IDs stay as they are.
- **L5.** `get_public_open_jobs` and `get_public_job_*` are anon-callable by design. They return no personal data. OK.

### Verified OK
- Roles live in `user_roles` and are checked server-side with `has_role()`. `prevent_role_escalation` blocks admin self-assignment, and anon is blocked.
- `profiles`, `employers` and `employment_records` are fully blocked for anon. Signed-in access is limited to owners and admins, plus a narrow "employed by" rule.
- Credentials can only be revoked; a trigger guards every other field. Sealed projects can't be changed.
- Verification tokens are stored as hashes.

## 2. Fix order (no changes until you approve)
1. C1 and H3: lock function grants and add caller checks in a single database change.
2. H1 and H2: enforce visibility and share consent in the profile and employment lookups. Update the public profile and QR pages to use the limited outputs.
3. M4: sign credentials only from stored record data.
4. M1: CORS allow-list in a shared helper for all functions.
5. M6 and M7: deletion job, export check, analytics only after consent.
6. M5: hash national ID for deduplication, and keep raw IDs out of AI prompts.
7. M2 and the Low items.

After each step, sign in as the test seeker, employer and admin and re-run the main flows: profile share/QR, apply, interview, promotion approval, credential issue/verify, export.

## 3. Workforce/HR product improvements (2026)

Essential (low friction, builds on what exists):
1. Share links with an expiry date and a per-employer consent screen, which also fixes H1/H4.
2. A verified-employment PDF and QR with live revocation status.
3. Interview scheduling with calendar (.ics) invites and reminder emails.
4. Bulk offboarding (end dates in one step) and an employer reminder to confirm former staff.
5. Candidate privacy centre: who viewed or verified my record, consent toggles, export/delete status.
6. Employer verification SLA dashboard for admins.

Later-stage:
- Background-check partner APIs and a government ID check (per country).
- Skills taken from verified projects, plus skills-based matching.
- Wallet credentials (W3C Verifiable Credentials) for Apple/Google Wallet.
- Multi-user employer workspaces (HR admin, recruiter, viewer).
- Payroll/HRIS connectors (Workday, BambooHR, Odoo).
- Analytics: time-to-hire, source quality, retention.

## Technical notes
- Grant evidence comes from `pg_proc.proacl` (`anon=X` present on most SECURITY DEFINER functions). Policy evidence comes from `pg_policies`.
- Items marked UNVERIFIED still need a line-by-line read (export, deletion, duplicate-detection prompts, storage policy expressions, consent gating). That's done at the start of step 1.
