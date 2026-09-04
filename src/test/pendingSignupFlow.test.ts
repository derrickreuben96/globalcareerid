/**
 * End-to-end flow test: Register (email confirmation required) → email
 * confirmation → login, asserting that pending signup fields are only ever
 * stamped onto the account that started the registration.
 *
 * The Supabase client is replaced with a small in-memory fake that records
 * every write per user, so we can assert exactly which account got written to.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// ---- Fake backend -----------------------------------------------------------

type Write = { table: string; op: 'update' | 'insert'; userId?: string; values: Record<string, unknown> };

const writes: Write[] = [];
const auditEvents: Array<{ type: string; userId: string; metadata: Record<string, unknown> }> = [];

/** Rows the DB trigger creates on signup, keyed by user id. */
const profileRows = new Set<string>();
const employerRows = new Set<string>();

function chain(table: string) {
  const state: { op?: 'update' | 'insert'; values?: Record<string, unknown>; userId?: string } = {};
  const api: Record<string, unknown> = {
    select: () => api,
    order: () => api,
    limit: () => api,
    update(values: Record<string, unknown>) {
      state.op = 'update';
      state.values = values;
      return api;
    },
    insert(values: Record<string, unknown>) {
      state.op = 'insert';
      state.values = values;
      state.userId = values.user_id as string;
      writes.push({ table, op: 'insert', userId: state.userId, values });
      if (table === 'employers' && state.userId) employerRows.add(state.userId);
      return Promise.resolve({ data: null, error: null });
    },
    eq(_col: string, value: string) {
      state.userId = value;
      if (state.op === 'update' && state.values) {
        writes.push({ table, op: 'update', userId: value, values: state.values });
        state.values = undefined;
      }
      return api;
    },
    maybeSingle: async () => {
      if (table === 'profiles') {
        return { data: profileRows.has(state.userId!) ? { id: `p-${state.userId}` } : null, error: null };
      }
      if (table === 'employers') {
        return { data: employerRows.has(state.userId!) ? { id: `e-${state.userId}` } : null, error: null };
      }
      return { data: null, error: null };
    },
  };
  (api as { then?: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return api;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => chain(table),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'log_security_event') {
        auditEvents.push({
          type: args.event_type_param as string,
          userId: args.user_id_param as string,
          metadata: (args.metadata_param ?? {}) as Record<string, unknown>,
        });
      }
      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/logo.png' } }),
      }),
    },
  },
}));

import {
  savePendingSignup,
  flushPendingSignup,
  readPendingSignup,
  type PendingJobSeeker,
  type PendingEmployer,
} from '@/lib/pendingSignup';

const STORAGE_KEY = 'pending_signup_v1';

// ---- Flow helpers (mirror the real app's steps) ------------------------------

/** Step 1: user fills the Register form; signUp returns no session (email confirmation required). */
async function registerWithoutSession(payload: PendingJobSeeker | PendingEmployer) {
  await savePendingSignup(payload);
}

/** Steps 2 + 3: the user clicks the confirmation link and lands signed in.
 *  useAuth calls flushPendingSignup(userId, session.user.email) on SIGNED_IN. */
async function signIn(userId: string, email: string | null) {
  profileRows.add(userId); // DB trigger created the profile row at signup
  await flushPendingSignup(userId, email);
}

function writesFor(userId: string) {
  return writes.filter((w) => w.userId === userId);
}

const alice: PendingJobSeeker = {
  kind: 'career_individual',
  email: 'alice@example.com',
  firstName: 'Alice',
  country: 'Kenya',
  citizenship: 'Kenyan',
  nationalId: 'NAT-ALICE-1',
  passportNumber: 'P-ALICE',
  gender: 'female',
  dateOfBirth: '1995-04-12',
};

const acme: PendingEmployer = {
  kind: 'organization',
  email: 'hr@acme.test',
  companyName: 'Acme Corp',
  registrationNumber: 'REG-ACME',
  country: 'Kuwait',
  industry: 'Logistics',
  phone: '+965 0000',
  website: 'https://acme.test',
  logoDataUrl: 'data:image/png;base64,aGk=',
  logoFileName: 'logo.png',
};

beforeEach(() => {
  localStorage.clear();
  writes.length = 0;
  auditEvents.length = 0;
  profileRows.clear();
  employerRows.clear();
});

describe('Register → email confirmation → login (job seeker)', () => {
  it('stamps the pending fields onto the confirming account only', async () => {
    await registerWithoutSession(alice);

    // Data survives the browser round-trip while the email is unconfirmed.
    expect(await readPendingSignup()).not.toBeNull();

    await signIn('user-alice', 'alice@example.com');

    const profileWrites = writesFor('user-alice').filter((w) => w.table === 'profiles' && w.op === 'update');
    expect(profileWrites.length).toBe(1);
    expect(profileWrites[0].values).toMatchObject({
      national_id: 'NAT-ALICE-1',
      passport_number: 'P-ALICE',
      country: 'Kenya',
      citizenship: 'Kenyan',
      gender: 'female',
      date_of_birth: '1995-04-12',
      profile_complete: true,
    });

    // Buffer consumed, and the flush is traceable.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(auditEvents).toEqual([
      {
        type: 'pending_signup_flushed',
        userId: 'user-alice',
        metadata: { matched_email: 'alice@example.com', kind: 'career_individual' },
      },
    ]);
  });

  it('never stamps Alice\'s data onto Bob when Bob signs in first on the same browser', async () => {
    await registerWithoutSession(alice);

    // Shared/public browser: a different account signs in before Alice confirms.
    await signIn('user-bob', 'bob@example.com');

    expect(writes).toEqual([]);
    expect(writesFor('user-bob')).toEqual([]);
    expect(auditEvents).toEqual([
      {
        type: 'pending_signup_discarded',
        userId: 'user-bob',
        metadata: { reason: 'email_mismatch', kind: 'career_individual' },
      },
    ]);

    // Buffer is destroyed, so Alice's later login cannot pick it up either.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await signIn('user-alice', 'alice@example.com');
    expect(writes).toEqual([]);
  });

  it('discards the buffer when the confirmation link is opened after expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    await registerWithoutSession(alice);

    vi.setSystemTime(new Date('2026-09-10T00:00:00Z')); // > 7-day TTL
    await signIn('user-alice', 'alice@example.com');
    vi.useRealTimers();

    expect(writes).toEqual([]);
    expect(auditEvents).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('is idempotent across repeated logins', async () => {
    await registerWithoutSession(alice);
    await signIn('user-alice', 'alice@example.com');
    await signIn('user-alice', 'alice@example.com');
    await signIn('user-alice', 'alice@example.com');

    expect(writesFor('user-alice').filter((w) => w.table === 'profiles').length).toBe(1);
    expect(auditEvents.length).toBe(1);
  });
});

describe('Register → email confirmation → login (organization)', () => {
  it('creates the employer record for the confirming account only', async () => {
    await registerWithoutSession(acme);
    await signIn('org-acme', 'hr@acme.test');

    const orgUpdates = writesFor('org-acme').filter((w) => w.table === 'organization_profiles');
    expect(orgUpdates.length).toBe(1);
    expect(orgUpdates[0].values).toMatchObject({
      registration_number: 'REG-ACME',
      country: 'Kuwait',
      industry: 'Logistics',
      website: 'https://acme.test',
      logo_url: 'https://example.test/logo.png',
    });

    const employerInserts = writes.filter((w) => w.table === 'employers' && w.op === 'insert');
    expect(employerInserts.length).toBe(1);
    expect(employerInserts[0].userId).toBe('org-acme');
    expect(employerInserts[0].values).toMatchObject({ company_name: 'Acme Corp' });
  });

  it('never creates an employer record under an unrelated account', async () => {
    await registerWithoutSession(acme);

    await signIn('user-bob', 'bob@example.com');

    expect(writes.filter((w) => w.table === 'employers')).toEqual([]);
    expect(writes.filter((w) => w.table === 'organization_profiles')).toEqual([]);
    expect(employerRows.has('user-bob')).toBe(false);
    expect(auditEvents[0].type).toBe('pending_signup_discarded');
  });

  it('never applies data when the session has no email', async () => {
    await registerWithoutSession(acme);
    await signIn('org-acme', null);

    expect(writes).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects a tampered buffer whose email was swapped to the attacker\'s account', async () => {
    await registerWithoutSession(acme);
    const raw = localStorage.getItem(STORAGE_KEY)!;
    localStorage.setItem(STORAGE_KEY, raw.replace('hr@acme.test', 'mallory@evil.test'));

    await signIn('user-mallory', 'mallory@evil.test');

    expect(writes).toEqual([]);
    expect(auditEvents).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
