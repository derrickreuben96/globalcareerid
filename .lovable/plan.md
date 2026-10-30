# Global Career ID Product Upgrades: Architecture Assessment and Phased Plan

Nothing is built until you approve. Every phase adds new things only: existing records, Career IDs, credentials, visibility settings and current journeys stay as they are. Each phase sits behind its own on/off switch.

## 1. How things work today (confirmed by reading the code and database)

- **People**: `profiles` (one row per `user_id`; `visibility` text, used publicly only when it equals `'public'`; `national_id` and `passport_number` stored in plain text; `skills text[]`). Organization accounts are kept separate in `organization_profiles`. Roles live in `user_roles` (`app_role`: admin, job_seeker, employer).
- **Employers**: `employers.user_id` points to one owner. There is no membership table, so every employer authorization check (RLS, `get_my_employer`, `is_project_employer`, `resolve_career_id_for_employer`, `approve_promotion`) is written as `e.user_id = auth.uid()`.
- **Experience**: `employment_records` holds what employers write. Triggers handle auditing (`log_employment_record_changes`), notifications, the first role (`create_initial_role`), update restrictions, and syncing into `work_history` through `employment_record_id`. Other pieces: `role_history` and `promotion_requests`. `work_history` also covers self-reported history, verified through `verification_requests` (hashed token) and `verification_documents`. `projects` covers draft, pending, active, sealed and disputed, with `project_skills` and `project_audit_log`. `referral_letters` includes `verification_number`.
- **No tables exist yet** for education, certifications, internships, share links, access logs, employer members or interview availability.
- **Credentials**: `credentials` (ES256 `signed_jwt`, `revoked_at`) with these server functions: `sign-credential`, `check-revocation`, `get-public-key`. The `/verify-credential` page and the hooks `useCredential` and `useRevocationStatus` use them.
- **Hiring**: `jobs`, `applications` (`interview_at timestamptz`, `interview_notes`, an `employment_snapshot` that cannot be changed) and `recruitment_events` (filled by a trigger, read-only). Supporting functions: `notify-interview` and `score-application`. Screens: `HiringDashboard`, `ViewApplicationsDialog`, `AppliedJobsTracker`.
- **Public pages**: `/verify/:profileId` uses `get_public_profile_by_id` and `get_employment_by_profile_id`, which return public profiles only. Employers find people through `search_public_profiles` (public profiles only, limit 100, skill filter not applied).
- **Privacy**: `consent_log`, `data_export_requests` with the `export-user-data` function, `deletion_requests` (no deletion runner found in the code), and the `/settings/privacy` page.
- **Server functions**: 29 in total. Four have the platform's sign-in check turned off and check access themselves: `admin-ai-assist`, `request-employer-verification`, `verify-employment` and `detect-duplicates`.

## 2. Decisions I made where your brief was open (please correct any)

1. **Discoverability vs verification.** The current `profiles.visibility` keeps its meaning. I'll add a separate setting for "discoverable in search" that is off by default, so nobody becomes searchable without opting in. Verification consent is given per share link, not as one global switch.
2. **Who can issue education and internship records.** Universities become a new organization type, `issuer_kind` on `employers` with default `'employer'`. This reuses the existing employer verification process. No university partner integration yet.
3. **The person's role in passport records.** People can add their own education and certifications, but these stay marked "self-reported" until an organization verifies them, the same as `work_history` today.
4. **Existing employer owners.** Each current owner becomes `org_admin` in the new membership table. A copy of each relationship that already exists is not invented data, and `employers.user_id` stays the owner.
5. **Passport download.** The file is built in the browser from data the person is already allowed to see. Nothing is stored on the server.
6. **Reminders.** Reminders show inside the app and go out by email through the existing Resend setup, sent by a scheduled check. No outside calendar accounts are connected. Calendar invites are downloadable `.ics` files.

## 3. Phases (in dependency order)

### Phase 0: Groundwork
- `feature_flags(key text pk, enabled bool default false)`, read through `is_feature_enabled(key)`.
- `access_audit_log` (append-only; the browser has no write access; written only through security-definer functions).
- Add the `has_org_role` helper. Its first version simply checks `employers.user_id` ownership, so behaviour is identical.

### Phase 1: Multi-user employer accounts (F), needed by B, C and E
- `employer_members(id, employer_id fk, user_id uuid, member_role enum org_admin|recruiter|hiring_manager|verification_officer, status invited|active|removed, invited_by, created_at)`, unique on `(employer_id, user_id)`.
- `employer_invitations` (hashed token, expiry, single use).
- Current owners are copied in as `org_admin`, and `ON CONFLICT DO NOTHING` makes re-running safe.
- **Permissions** (every check runs on the server through `has_org_role(employer_id, roles[])`):

| Role | What they can do |
|---|---|
| recruiter | jobs, applications, interviews |
| hiring_manager | read applications, give feedback |
| verification_officer | employment records, promotions, referral letters, credentials |
| org_admin | everything, plus member management |

- Existing RLS rules and functions get new versions that add the membership check. Owner access is unchanged.
- Each version is tested on its own before the next one is switched over.
- **Tenant isolation**: every rule filters by `employer_id`, so a member of one employer can never reach another employer's data.
- **Audit**: every member change is logged.
- **Screens**: a new Team tab on `/employer`.

### Phase 2: Privacy centre and consent model (G), needed by A and B
- New `profile_privacy_settings` table, one row per user, created when first needed:
  - `discoverable bool default false`
  - `show_in_search_fields jsonb`
  - `retention_preference`
- `/settings/privacy` gets new tabs for "Who viewed my records" (from `access_audit_log`) and active share links.
- **Deletion**: a scheduled server function runs approved `deletion_requests` after `scheduled_for`. It anonymises profile personal details and keeps employer-owned history where the law allows (needs legal sign-off). Off until the switch is turned on.
- **Export**: add the new tables to `export-user-data`.
- National ID and passport numbers never appear in any new function, export view, share view or log.

### Phase 3: Internship, graduate and education records (D)
- **Internships and similar.** Add `employment_records.engagement_type text default 'employment'` with these values: employment, internship, attachment, apprenticeship, graduate_trainee, research.
  - Existing rows automatically read as `'employment'`.
  - The triggers carry it into `work_history.engagement_type`, which is also new.
  - The sync function gets a new version that adds this one column.
- **Education and certifications.** New tables `education_records` and `certifications` with these columns: `user_id`, `issuer_employer_id` (may be empty), `verification_status` (self_reported, pending, verified, rejected), dates (date type), and `credential_url`.
- **Issuer verification.** The verifying organization confirms through a security-definer function that checks `has_org_role(issuer, verification_officer)`.
- **Screens**: `WorkHistory`, `EmploymentTimeline`, and the employer add-record form gain a type selector, defaulting to Employment.

### Phase 4: Career Passport (A) and Smart Sharing (B)
- **Share links**: `share_links(id, user_id, token_hash, label, expires_at not null, revoked_at, max_views int null, view_count, viewer_employer_id null, viewer_email_hash null, created_at)`.
- **Chosen records**: `share_link_items(share_link_id, item_type, item_id)`. Item types are employment, work_history, education, certification, project, referral and credential.
- **Consent**: creating a link writes a `consent_log` entry with `consent_type='share_link'`.
- **Viewing**: `get_shared_passport(token text)` is a security-definer function that anyone with the link can call. It:
  - hashes the token and checks that the link is not expired, not revoked and still has views left
  - checks the viewer's employer if the link is limited to one
  - logs the view in `access_audit_log`
  - returns only the selected items and the minimum fields
  - adds credential status by checking `credentials.revoked_at`
- **Rate limiting**: through `check_rate_limit`, called on the server side by a small server function, `view-shared-passport`, which wraps the database function.
- **Pages**:
  - `/passport`: the owner's own view, with PDF download
  - `/share/:token`: what the viewer sees
  - `/settings/privacy` gets a list of links with a revoke button
- The current `/verify/:profileId` page is not changed.

### Phase 5: Skills-based talent search (C)
- A new function, `search_talent(filters jsonb)`, with these rules:
  - only verified employer members can use it
  - only `discoverable = true` people appear
  - filters cover skills (`&&` on `profiles.skills`, plus `project_skills`), verified-only, experience level, industry (via the employer), certifications and project count
  - fixed sort order with page-by-page results, 50 per page
  - every search is logged
- `search_public_profiles` stays as it is for compatibility.
- A GIN index on `profiles.skills`.

### Phase 6: Interview scheduling (E)
- **Interviews**: `interviews(id, application_id fk, employer_id, scheduled_start timestamptz, scheduled_end timestamptz, timezone text (IANA), location_or_link, status scheduled|rescheduled|cancelled|completed, created_by, created_at)`.
  - Existing `applications.interview_at` values are kept, and a database trigger keeps them in step with the latest interview so current screens keep working.
  - The trigger copies data that already exists, so nothing is invented.
- **Other new tables**:
  - `interview_feedback(interview_id, reviewer_id, rating 1-5, notes)`, readable by members only, never by the candidate
  - `candidate_availability(application_id, slot_start, slot_end)`
  - `interview_reminders(interview_id, send_at, sent_at)`, unique per interview and offset so the same reminder is never sent twice
- **Calendar invites**: `.ics` files built in the browser from the stored UTC times.
- **Times**: everything is stored in UTC and shown in the viewer's own timezone, with the interviewer's timezone label next to it.
- **Reminders**: a scheduled server function, `send-interview-reminders`, sends them. The `recruitment_events` trigger keeps recording changes.

### Phase 7: Later-stage assessment only (H, I)
- A design document for a W3C VC 2.0 adapter: a `vc+jwt` view built on top of the existing ES256 JWT, with no change to existing `credentials` identifiers.
- The rest is roadmap entries with nothing built: HR integrations, analytics, university partnerships, background-check providers and interview rooms.

## 4. Migration order (additive and forward-only)

```text
M1 feature_flags, access_audit_log, has_org_role (owner-only)
M2 employer_members, employer_invitations, owner copy-in
M3 new RLS/function versions using has_org_role (one table group per migration)
M4 profile_privacy_settings, deletion runner function (switch off)
M5 engagement_type columns + updated sync trigger; education_records, certifications
M6 share_links, share_link_items, get_shared_passport
M7 skills GIN index, search_talent
M8 interviews, feedback, availability, reminders, interview_at sync trigger
```

Every table gets its GRANTs, RLS and rules, with no anon access except through security-definer functions with tight checks.

**Rollback**: turn the phase's switch off. Old code paths stay untouched, and functions keep their existing names and arguments.

## 5. Lifecycle summary

| Feature | Create | Read | Update | Delete | Transaction | Idempotency |
|---|---|---|---|---|---|---|
| Members | org_admin | members | org_admin | soft remove | one function call | unique key |
| Share link | owner | token holder, owner | owner revokes | revoke only | function that also writes consent | token hash unique |
| Education/cert | owner or issuer | owner, share | issuer verifies | owner, if not verified | function | – |
| Interviews | recruiter | members, candidate | recruiter | cancel status | function + trigger | reminder unique key |

## 6. Test matrix

**Existing journeys (regression, with the three test accounts):**
- registration (person and organization)
- profile edit and photo
- employer adds an employment record, which then syncs to the history
- promotion approval
- retroactive token verification
- referral letter creation and checking its verification number
- `/verify/:id` for a public profile and for a private one
- issuing, checking and revoking a credential
- job post, applying with a Career ID, and the pipeline
- the current interview fields
- employer verification
- notifications
- export and a deletion request

**New journeys:**
- **Cross-tenant**: a member of employer A tries to read or write employer B's jobs, applications, members, interviews and searches, and is refused.
- **Role permissions**: a recruiter tries to approve a promotion (refused), a hiring manager tries to edit a job (refused), and a verification officer tries to see applications (refused).
- **Consent**: links with no consent, expired, revoked, out of views, and opened by the wrong employer all return nothing and are logged.
- **Duplicates**: copying owners in twice, sending a reminder twice, and accepting an invite twice.
- **Old records**: rows without `engagement_type` show as Employment, and existing `interview_at` still shows.
- **Timezones**: an interview around 23:30 UTC, a daylight-saving change, and display in Arabic right-to-left and in other languages.
- **Discoverability**: private or undiscoverable profiles are left out of `search_talent`.
- **National ID and passport**: never present in passport, share, search or export view responses.
- **Function permissions**: tests confirm anon can only reach `get_shared_passport` and the existing public lookups.

## 7. Open questions
1. Should universities sign up as a new organization type, as I assumed, or be added by an admin?
2. How long should a deleted account's employer-owned history be kept? This needs legal input.
3. Default share-link expiry: I propose 30 days with a 365-day maximum.
4. Should candidates see interview feedback? I assumed no.

No deploy or publish.
