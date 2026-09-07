import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

const KEY = 'pending_signup_v1';
const SIGNING_KEY_STORAGE = 'pending_signup_sigkey_v1';

/** Pending signup data expires after 7 days — email verification links also expire. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingJobSeeker = {
  kind: 'career_individual';
  country?: string;
  citizenship?: string;
  nationalId?: string;
  passportNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  firstName?: string;
};

export type PendingEmployer = {
  kind: 'organization';
  companyName: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  phone?: string;
  website?: string;
  email?: string;
  logoDataUrl?: string;
  logoFileName?: string;
};

export type PendingSignup = PendingJobSeeker | PendingEmployer;

interface PendingEnvelope {
  v: 1;
  /** Registration email the payload is cryptographically bound to. */
  email: string;
  createdAt: number;
  expiresAt: number;
  payload: PendingSignup;
  /** Hex HMAC-SHA256 over the canonical envelope body. */
  sig: string;
}

// ---------------------------------------------------------------------------
// Signing helpers (Web Crypto HMAC-SHA256, per-installation random key)
// ---------------------------------------------------------------------------

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let cachedKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;

  try {
    let raw = localStorage.getItem(SIGNING_KEY_STORAGE);
    if (!raw) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      raw = bytesToBase64(bytes);
      localStorage.setItem(SIGNING_KEY_STORAGE, raw);
    }
    cachedKey = await crypto.subtle.importKey(
      'raw',
      base64ToBytes(raw),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    return cachedKey;
  } catch (e) {
    console.warn('Pending signup: signing key unavailable:', e);
    return null;
  }
}

/** Canonical string that is signed — binds payload to email and expiry. */
function canonicalBody(email: string, createdAt: number, expiresAt: number, payload: PendingSignup): string {
  return JSON.stringify({ email, createdAt, expiresAt, payload });
}

async function signBody(body: string, key: CryptoKey): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return bytesToHex(sig);
}

async function verifyBody(body: string, hexSig: string, key: CryptoKey): Promise<boolean> {
  try {
    return await crypto.subtle.verify('HMAC', key, base64ToBytes(hexToBase64(hexSig)), new TextEncoder().encode(body));
  } catch {
    return false;
  }
}

function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytesToBase64(bytes);
}

// ---------------------------------------------------------------------------
// Storage API
// ---------------------------------------------------------------------------

/**
 * Persist pending signup data, signed and bound to the registration email.
 * Fail-safe: if signing is unavailable, nothing is stored (better to lose
 * the buffer than to store an unverifiable payload).
 */
export async function savePendingSignup(payload: PendingSignup): Promise<void> {
  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    console.warn('Pending signup: refusing to save payload without a registration email');
    return;
  }

  const key = await getSigningKey();
  if (!key) {
    console.warn('Pending signup: Web Crypto unavailable — payload not buffered');
    return;
  }

  const createdAt = Date.now();
  const expiresAt = createdAt + TTL_MS;
  const body = canonicalBody(email, createdAt, expiresAt, payload);
  const sig = await signBody(body, key);

  const envelope: PendingEnvelope = { v: 1, email, createdAt, expiresAt, payload, sig };
  try {
    localStorage.setItem(KEY, JSON.stringify(envelope));
  } catch (e) {
    console.warn('Failed to persist pending signup data:', e);
  }
}

export function clearPendingSignup() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/**
 * Read the pending signup payload, or null when missing, expired, tampered,
 * or in a legacy (unsigned) format. Invalid/expired data is always removed
 * from storage as a side effect — cleanup is automatic.
 */
export async function readPendingSignup(): Promise<PendingSignup | null> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let envelope: PendingEnvelope;
  try {
    envelope = JSON.parse(raw) as PendingEnvelope;
  } catch {
    clearPendingSignup();
    return null;
  }

  // Reject legacy unsigned payloads and malformed envelopes.
  if (
    envelope?.v !== 1 ||
    typeof envelope.email !== 'string' ||
    typeof envelope.sig !== 'string' ||
    typeof envelope.expiresAt !== 'number' ||
    !envelope.payload
  ) {
    clearPendingSignup();
    return null;
  }

  // Expired — clean up immediately.
  if (Date.now() > envelope.expiresAt) {
    clearPendingSignup();
    return null;
  }

  const key = await getSigningKey();
  if (!key) {
    // Cannot verify integrity — do not trust the payload.
    clearPendingSignup();
    return null;
  }

  const body = canonicalBody(envelope.email, envelope.createdAt, envelope.expiresAt, envelope.payload);
  const valid = await verifyBody(body, envelope.sig, key);
  if (!valid) {
    // Tampered payload — discard it.
    clearPendingSignup();
    return null;
  }

  return envelope.payload;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Best-effort audit event via the security-definer log function.
 * Never throws — audit failure must not break the flush.
 */
async function logPendingSignupEvent(
  eventType: 'pending_signup_flushed' | 'pending_signup_discarded',
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      event_type_param: eventType,
      user_id_param: userId,
      metadata_param: metadata as Json,
    });
    if (error) console.warn('Pending signup audit log failed:', error.message);
  } catch (e) {
    console.warn('Pending signup audit log failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

/**
 * Flush pending signup form data collected before email verification.
 * Safe to call multiple times — clears storage after a successful flush.
 *
 * SECURITY: the payload is only applied when the signed-in user's email
 * matches the registration email the payload was signed for. Any mismatch
 * discards the buffer and records an audit event.
 */
export async function flushPendingSignup(userId: string, userEmail?: string | null): Promise<void> {
  const pending = await readPendingSignup();
  if (!pending) return;

  const pendingEmail = pending.email?.trim().toLowerCase();
  const currentEmail = userEmail?.trim().toLowerCase();

  if (!pendingEmail || !currentEmail || pendingEmail !== currentEmail) {
    // Cross-account stamping attempt — discard and audit.
    clearPendingSignup();
    await logPendingSignupEvent('pending_signup_discarded', userId, {
      reason: 'email_mismatch',
      kind: pending.kind,
    });
    return;
  }

  try {
    if (pending.kind === 'career_individual') {
      const updates: Record<string, unknown> = {};
      if (pending.country) updates.country = pending.country;
      if (pending.citizenship) updates.citizenship = pending.citizenship;
      if (pending.nationalId?.trim()) {
        updates.national_id = pending.nationalId.trim();
        updates.profile_complete = true;
      }
      if (pending.passportNumber?.trim()) updates.passport_number = pending.passportNumber.trim();
      if (pending.gender) updates.gender = pending.gender;
      if (pending.dateOfBirth) updates.date_of_birth = pending.dateOfBirth;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId);
        if (error) throw error;
      }
    } else if (pending.kind === 'organization') {
      // Wait for the DB trigger to have created the profile row
      for (let i = 0; i < 10; i++) {
        const { data: p } = await supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle();
        if (p) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      let logoUrl: string | null = null;
      if (pending.logoDataUrl && pending.logoFileName) {
        try {
          const blob = dataUrlToBlob(pending.logoDataUrl);
          const ext = pending.logoFileName.split('.').pop() || 'png';
          const path = `${userId}/logo.${ext}`;
          logoUrl = await uploadCompanyLogo(path, blob);
        } catch (e) {
          console.warn('Deferred logo upload failed:', e);
        }
      }

      await supabase
        .from('organization_profiles')
        .update({
          registration_number: pending.registrationNumber,
          country: pending.country,
          industry: pending.industry,
          phone: pending.phone,
          website: pending.website,
          ...(logoUrl && { logo_url: logoUrl }),
        })
        .eq('user_id', userId);

      // Only insert an employers row if one doesn't already exist
      const { data: existing } = await supabase
        .from('employers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('employers').insert({
          user_id: userId,
          company_name: pending.companyName,
          registration_number: pending.registrationNumber,
          country: pending.country,
          industry: pending.industry,
          phone: pending.phone,
          website: pending.website,
          ...(logoUrl && { logo_url: logoUrl }),
        });
      }
    }

    clearPendingSignup();

    // Audit: record exactly which email the flush matched.
    await logPendingSignupEvent('pending_signup_flushed', userId, {
      matched_email: currentEmail,
      kind: pending.kind,
    });
  } catch (e) {
    console.warn('Failed to flush pending signup — will retry on next sign-in:', e);
  }
}
