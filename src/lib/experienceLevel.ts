/**
 * Calculates experience level based on total months of work history.
 * Tiers:
 *  - entry:     < 36 months  (0-2 yrs)
 *  - mid:       36-71 months (3-5 yrs)
 *  - senior:    72-131 months (6-10 yrs)
 *  - lead:      >= 132 months (11+ yrs)
 *
 * `executive` is a role-based tier and is NOT auto-assigned from tenure.
 * If the existing profile already has `executive`, it is preserved.
 */
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface TenureRecord {
  start_date: string;
  end_date?: string | null;
  status?: string | null;
}

export function calculateTotalMonths(records: TenureRecord[]): number {
  if (!records?.length) return 0;
  const now = new Date();
  let totalMs = 0;
  for (const r of records) {
    if (r.status && !['active', 'ended'].includes(r.status)) continue;
    const start = new Date(r.start_date);
    if (isNaN(start.getTime())) continue;
    const end = r.end_date ? new Date(r.end_date) : now;
    if (isNaN(end.getTime())) continue;
    const ms = end.getTime() - start.getTime();
    if (ms > 0) totalMs += ms;
  }
  return Math.floor(totalMs / (1000 * 60 * 60 * 24 * 30.4375));
}

export function deriveExperienceLevel(
  totalMonths: number,
  current?: ExperienceLevel | string | null
): ExperienceLevel {
  // Preserve manually-set executive tier
  if (current === 'executive') return 'executive';
  if (totalMonths < 36) return 'entry';
  if (totalMonths < 72) return 'mid';
  if (totalMonths < 132) return 'senior';
  return 'lead';
}

export function experienceLevelLabel(level: ExperienceLevel | string): string {
  switch (level) {
    case 'entry': return 'Entry Level (0-2 yrs)';
    case 'mid': return 'Mid Level (3-5 yrs)';
    case 'senior': return 'Senior (6-10 yrs)';
    case 'lead': return 'Lead / Principal (11+ yrs)';
    case 'executive': return 'Executive / C-Level';
    default: return 'Entry Level';
  }
}
