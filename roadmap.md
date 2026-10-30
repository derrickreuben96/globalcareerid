- [x] Correct employer-name reads across career records, pending records, letters, and future application snapshots without exposing private company data.
- [x] Restore the missing synchronized role and link all existing/future history rows to their source records.
- [x] Verify Derrick's historical/current records, unrelated-employer denial, private-field exclusion, and regression tests.
- [x] Add employer hiring pipeline, interview schedule, stats, filters, and recruitment timeline.
- [x] Preserve existing applicant actions and securely record future recruitment stage changes.
- [x] Test hiring calculations and verify the signed-in employer dashboard end to end.- [x] Security remediation: promotion approval auth, public lookups limited to public profiles, least-privilege function grants, credential claims from stored records, single-use POST employer confirmations, CORS allow-list, regression tests.
- [ ] Later (not in this pass): per-viewer share links/consent, analytics/Sentry consent gating, scheduled account deletion, AI/email rate limits, ID-number encryption at rest.

## Product upgrades (phases 0–6, per approved plan + 10 safeguards)
- [ ] Phase 0 foundation (flags off, access audit log, central org helper) — blocked: needs approval to change the shared live database
- [ ] Phase 1 employer memberships + hashed email-bound invitations
- [ ] Phase 2 privacy centre, versioned consent, deletion runner left disabled behind legal gate
- [ ] Phase 3 engagement_type + education/certifications (self_reported/pending/verified/rejected/revoked)
- [ ] Phase 4 Career Passport + smart share links (atomic expiry/revoke/view-limit/rate-limit)
- [ ] Phase 5 discoverable-only deterministic skills search
- [ ] Phase 6 interviews, availability, feedback, idempotent reminders, safe ICS
- [ ] Phase 7 (later only): HR integrations, W3C VC 2.0 adapter, interview rooms, university partnerships, background checks
