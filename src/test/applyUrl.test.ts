import { describe, it, expect } from 'vitest';
import {
  buildApplyUrl,
  isCanonicalApplyUrl,
  toCanonicalApplyUrl,
  CANONICAL_APPLY_PREFIX,
} from '@/lib/applyUrl';

describe('apply URL trust enforcement', () => {
  const JOB_ID = 'b3c2f4d6-1111-2222-3333-444455556666';

  it('builds canonical job_id-only URLs on globalcareerid.com', () => {
    const url = buildApplyUrl(JOB_ID);
    expect(url).toBe(`${CANONICAL_APPLY_PREFIX}${JOB_ID}`);
    expect(url.startsWith('https://globalcareerid.com/apply?job_id=')).toBe(true);
    expect(isCanonicalApplyUrl(url)).toBe(true);
  });

  it('rejects lovable.app, preview, and non-https URLs', () => {
    expect(isCanonicalApplyUrl(`https://example.lovable.app/apply?job_id=${JOB_ID}`)).toBe(false);
    expect(isCanonicalApplyUrl(`http://globalcareerid.com/apply?job_id=${JOB_ID}`)).toBe(false);
    expect(isCanonicalApplyUrl(`https://localhost/apply?job_id=${JOB_ID}`)).toBe(false);
  });

  it('rejects legacy company_id and PENDING placeholder URLs as canonical', () => {
    expect(isCanonicalApplyUrl(
      `https://globalcareerid.com/apply?job_id=${JOB_ID}&company_id=abc`,
    )).toBe(false);
    expect(isCanonicalApplyUrl('https://globalcareerid.com/apply?job_id=PENDING')).toBe(false);
    expect(isCanonicalApplyUrl('https://globalcareerid.com/apply')).toBe(false);
  });

  it('upgrades legacy company_id links to canonical job_id URLs', () => {
    const legacy = `https://globalcareerid.com/apply?job_id=${JOB_ID}&company_id=zzz`;
    expect(toCanonicalApplyUrl(legacy)).toBe(buildApplyUrl(JOB_ID));
  });

  it('resolves relative legacy paths', () => {
    expect(toCanonicalApplyUrl(`/apply?job_id=${JOB_ID}&company_id=zzz`))
      .toBe(buildApplyUrl(JOB_ID));
  });

  it('returns null for malformed or PENDING legacy URLs', () => {
    expect(toCanonicalApplyUrl('not a url')).toBe(null);
    expect(toCanonicalApplyUrl('https://globalcareerid.com/apply?job_id=PENDING')).toBe(null);
    expect(toCanonicalApplyUrl('https://globalcareerid.com/other?job_id=x')).toBe(null);
  });
});
