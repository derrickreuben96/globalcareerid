# Phases 0–6 — written for review, NOT applied

Nothing here has run against the database. These files sit outside `drizzle/migrations` and `src`, so they cannot be applied or built by accident.

| File | Phase | Switch (all off) |
|---|---|---|
| M1_foundation.sql | 0: flags, access audit log, `has_org_role` (owner-only v1) | – |
| M2_employer_members.sql | 1: members, hashed email-bound single-use invitations | employer_members |
| M3 (not yet written) | 1: swap owner checks to `has_org_role`, one table group per migration, after M2 tests pass | – |
| M4_privacy_centre.sql | 2: privacy settings (discoverable off by default), consent version, deletion runner | privacy_centre, deletion_runner (needs legal sign-off) |
| M5_engagement_education.sql | 3: engagement types, education, certifications, issuer decisions | education_records |
| M6_passport_sharing.sql | 4: share links, atomic view claim, consent on create/revoke | career_passport |
| M7_talent_search.sql | 5: discoverable-only, verified-employer-only, deterministic paging | talent_search |
| M8_interviews.sql | 6: interviews, availability, member-only feedback, idempotent reminders | interview_scheduling |
| app/ics.ts | 6: safe calendar invite builder | – |

## After approval, in order
1. Apply M1 → M8 one at a time; run regression + new tests after each.
2. Then build the screens (Team tab, privacy tabs, /passport, /share/:token, talent search, interview scheduler) and the Edge Functions `invite-employer-member`, `view-shared-passport` (rate-limited), `send-interview-reminders`, `run-deletions` (flag-gated).
3. Turn switches on one phase at a time.

Phase 7 (integrations, W3C VC adapter, interview rooms) is roadmap only.
