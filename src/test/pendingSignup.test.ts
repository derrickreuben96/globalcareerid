import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';

// jsdom does not always expose the Web Crypto subtle API — fall back to Node's.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// ---- Supabase mock ---------------------------------------------------------

type ChainResult = { data: unknown; error: unknown };

function makeChain(result: ChainResult = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'update', 'insert', 'eq', 'order', 'limit']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  // Make the chain awaitable for calls like: await from(...).update(...).eq(...)
  (chain as { then?: unknown }).then = (resolve: (v: ChainResult) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

const fromMock = vi.fn((_table: string) => makeChain());
const rpcMock = vi.fn(async (_fn: string, _args: unknown) => ({ data: null, error: null }));
const storageUploadMock = vi.fn(async () => ({ data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
    storage: {
      from: () => ({
        upload: storageUploadMock,
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/logo.png' } }),
      }),
    },
  },
}));

import {
  savePendingSignup,
  readPendingSignup,
  clearPendingSignup,
  flushPendingSignup,
  type PendingJobSeeker,
} from '@/lib/pendingSignup';

const STORAGE_KEY = 'pending_signup_v1';

const jobSeekerPayload: PendingJobSeeker = {
  kind: 'career_individual',
  email: 'alice@example.com',
  firstName: 'Alice',
  country: 'Kenya',
  citizenship: 'Kenyan',
  nationalId: 'NAT-12345',
  passportNumber: 'P-999',
  gender: 'female',
  dateOfBirth: '1995-04-12',
};

function storedEnvelope(): Record<string, unknown> | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

beforeEach(() => {
  localStorage.clear();
  fromMock.mockClear();
  rpcMock.mockClear();
  storageUploadMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('savePendingSignup', () => {
  it('stores a signed envelope bound to the registration email', async () => {
    await savePendingSignup(jobSeekerPayload);

    const env = storedEnvelope();
    expect(env).not.toBeNull();
    expect(env!.v).toBe(1);
    expect(env!.email).toBe('alice@example.com');
    expect(typeof env!.sig).toBe('string');
    expect((env!.sig as string).length).toBeGreaterThan(0);
    expect(typeof env!.expiresAt).toBe('number');
    expect(env!.expiresAt as number).toBeGreaterThan(Date.now());
  });

  it('refuses to store a payload without a registration email', async () => {
    await savePendingSignup({ ...jobSeekerPayload, email: undefined });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('readPendingSignup', () => {
  it('returns the payload for a valid, unexpired envelope', async () => {
    await savePendingSignup(jobSeekerPayload);
    const read = await readPendingSignup();
    expect(read).not.toBeNull();
    expect(read!.email).toBe('alice@example.com');
    expect((read as PendingJobSeeker).nationalId).toBe('NAT-12345');
  });

  it('rejects and clears a tampered payload (email swapped after signing)', async () => {
    await savePendingSignup(jobSeekerPayload);

    // Attacker edits the stored email to their own account.
    const raw = localStorage.getItem(STORAGE_KEY)!;
    localStorage.setItem(STORAGE_KEY, raw.replace('alice@example.com', 'mallory@example.com'));

    const read = await readPendingSignup();
    expect(read).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects and clears expired payloads', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
    await savePendingSignup(jobSeekerPayload);

    // Jump 8 days into the future — beyond the 7-day TTL.
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'));

    const read = await readPendingSignup();
    expect(read).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects and clears legacy unsigned payloads', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobSeekerPayload));

    const read = await readPendingSignup();
    expect(read).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects and clears corrupted JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');

    const read = await readPendingSignup();
    expect(read).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('flushPendingSignup', () => {
  it('applies data and audits the flush when the signed-in email matches', async () => {
    await savePendingSignup(jobSeekerPayload);

    await flushPendingSignup('user-1', 'alice@example.com');

    // Profile was updated with the pending fields
    expect(fromMock).toHaveBeenCalledWith('profiles');

    // Storage cleared after a successful flush
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Audit event recorded with the matched email
    const auditCalls = rpcMock.mock.calls.filter(([fn]) => fn === 'log_security_event');
    expect(auditCalls.length).toBe(1);
    const args = auditCalls[0][1] as Record<string, unknown>;
    expect(args.event_type_param).toBe('pending_signup_flushed');
    expect(args.user_id_param).toBe('user-1');
    expect((args.metadata_param as Record<string, unknown>).matched_email).toBe('alice@example.com');
    expect((args.metadata_param as Record<string, unknown>).kind).toBe('career_individual');
  });

  it('matches emails case-insensitively and trims whitespace', async () => {
    await savePendingSignup(jobSeekerPayload);
    await flushPendingSignup('user-1', '  Alice@Example.COM ');

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('NEVER writes to the database when emails do not match', async () => {
    await savePendingSignup(jobSeekerPayload);

    await flushPendingSignup('user-2', 'bob@example.com');

    // No table writes at all
    expect(fromMock).not.toHaveBeenCalled();

    // Pending data is cleaned up, not left to hit the next sign-in
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Discard is audited with the mismatch reason
    const auditCalls = rpcMock.mock.calls.filter(([fn]) => fn === 'log_security_event');
    expect(auditCalls.length).toBe(1);
    const args = auditCalls[0][1] as Record<string, unknown>;
    expect(args.event_type_param).toBe('pending_signup_discarded');
    expect((args.metadata_param as Record<string, unknown>).reason).toBe('email_mismatch');
  });

  it('NEVER writes when the signed-in user has no email', async () => {
    await savePendingSignup(jobSeekerPayload);

    await flushPendingSignup('user-3', null);

    expect(fromMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does nothing when there is no pending data', async () => {
    await flushPendingSignup('user-1', 'alice@example.com');

    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('discards tampered payloads without touching the database', async () => {
    await savePendingSignup(jobSeekerPayload);
    const raw = localStorage.getItem(STORAGE_KEY)!;
    localStorage.setItem(STORAGE_KEY, raw.replace('NAT-12345', 'NAT-EVIL1'));

    await flushPendingSignup('user-1', 'alice@example.com');

    expect(fromMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('applies organization payloads only for the matching email', async () => {
    await savePendingSignup({
      kind: 'organization',
      companyName: 'Acme Corp',
      registrationNumber: 'REG-1',
      country: 'Kuwait',
      industry: 'Logistics',
      phone: '+965 0000',
      website: 'https://acme.test',
      email: 'hr@acme.test',
    });

    await flushPendingSignup('user-9', 'hr@acme.test');

    const tables = fromMock.mock.calls.map(([t]) => t);
    expect(tables).toContain('organization_profiles');
    expect(tables).toContain('employers');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const auditCalls = rpcMock.mock.calls.filter(([fn]) => fn === 'log_security_event');
    expect(auditCalls.length).toBe(1);
    expect(
      (auditCalls[0][1] as Record<string, unknown>).event_type_param
    ).toBe('pending_signup_flushed');
  });
});

describe('clearPendingSignup', () => {
  it('removes stored data', async () => {
    await savePendingSignup(jobSeekerPayload);
    clearPendingSignup();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
