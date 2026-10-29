import { describe, expect, it } from 'vitest';
import { filterHiringApplications, hiringStats, type HiringApplication } from '@/lib/hiringPipeline';

const now = Date.parse('2026-10-29T07:28:00Z');
const app = (id: string, status: string, extra: Partial<HiringApplication> = {}): HiringApplication => ({
  id, status, job_id: 'job-1', created_at: '2026-10-28T00:00:00Z', updated_at: '2026-10-28T00:00:00Z',
  interview_at: null, interview_notes: null, ai_score: null, name: 'Derrick Reuben', careerId: 'GC-001', ...extra,
});
describe('employer recruitment cycle', () => {
  it('counts applicants, interviews and hires without treating rejected or hired candidates as active', () => {
    const stats = hiringStats([app('1', 'submitted'), app('2', 'interview'), app('3', 'hired'), app('4', 'rejected')], now);
    expect(stats).toEqual({ applicants: 4, active: 2, interviews: 1, upcoming: 0, hired: 1, conversion: 25 });
  });
  it('only counts future scheduled interviews in the interview stage as upcoming', () => {
    expect(hiringStats([app('1', 'interview', { interview_at: '2026-10-30T10:00:00Z' }), app('2', 'interview', { interview_at: '2026-10-28T10:00:00Z' }), app('3', 'hired', { interview_at: '2026-10-30T10:00:00Z' })], now).upcoming).toBe(1);
  });
  it('filters applicants by job, Career ID and application date together', () => {
    const apps = [app('match', 'submitted'), app('other-job', 'submitted', { job_id: 'job-2' }), app('old', 'submitted', { created_at: '2026-08-01T00:00:00Z' })];
    expect(filterHiringApplications(apps, 'job-1', 'gc-001', 30, now).map(a => a.id)).toEqual(['match']);
  });
  it('handles an empty recruitment cycle without invalid conversion figures', () => {
    expect(hiringStats([], now).conversion).toBe(0);
  });
});