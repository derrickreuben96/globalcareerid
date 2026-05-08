/**
 * Canonical Apply URL utilities.
 *
 * ALL apply links, QR payloads, and poster URLs MUST go through these
 * helpers so they always resolve to the official Global Career ID domain.
 */

export const APPLY_ORIGIN = 'https://globalcareerid.com';
export const APPLY_PATH = '/apply';
export const CANONICAL_APPLY_PREFIX = `${APPLY_ORIGIN}${APPLY_PATH}?job_id=`;

/** Build the canonical apply URL for a given job id. */
export function buildApplyUrl(jobId: string): string {
  if (!jobId) throw new Error('buildApplyUrl: jobId is required');
  return `${CANONICAL_APPLY_PREFIX}${encodeURIComponent(jobId)}`;
}

/** Strict validation — rejects lovable.app, localhost, http, extra params, etc. */
export function isCanonicalApplyUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== 'globalcareerid.com') return false;
    if (u.pathname !== '/apply') return false;
    const jobId = u.searchParams.get('job_id');
    if (!jobId) return false;
    // Must NOT contain legacy company_id / placeholder values
    if (u.searchParams.get('company_id')) return false;
    if (jobId === 'PENDING') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a (possibly legacy) apply URL into a canonical one.
 * Returns null if it cannot be resolved.
 *
 * Legacy form: /apply?job_id=...&company_id=...
 * Canonical : /apply?job_id=...
 */
export function toCanonicalApplyUrl(url: string): string | null {
  try {
    const u = new URL(url, APPLY_ORIGIN);
    if (u.pathname !== '/apply') return null;
    const jobId = u.searchParams.get('job_id');
    if (!jobId || jobId === 'PENDING') return null;
    return buildApplyUrl(jobId);
  } catch {
    return null;
  }
}
