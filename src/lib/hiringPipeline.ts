export const HIRING_STAGES = [
  { value: 'submitted', label: 'Applied' },
  { value: 'under_review', label: 'Under review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
] as const;
export type HiringStatus = typeof HIRING_STAGES[number]['value'];
export interface HiringApplication {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  interview_at: string | null;
  interview_notes: string | null;
  ai_score: number | null;
  name: string;
  careerId: string;
}
export interface RecruitmentEvent {
  id: string;
  application_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string;
  interview_at: string | null;
  occurred_at: string;
}
export function hiringStats(apps: HiringApplication[], now: number) {
  const hired = apps.filter(a => a.status === 'hired').length;
  return {
    applicants: apps.length,
    active: apps.filter(a => !['hired', 'rejected'].includes(a.status)).length,
    interviews: apps.filter(a => a.status === 'interview').length,
    upcoming: apps.filter(a => a.status === 'interview' && a.interview_at && Date.parse(a.interview_at) >= now).length,
    hired,
    conversion: apps.length ? Math.round(hired / apps.length * 100) : 0,
  };
}
export function filterHiringApplications(apps: HiringApplication[], jobId: string, search: string, days: number, now: number) {
  const query = search.trim().toLowerCase();
  return apps.filter(a => (jobId === 'all' || a.job_id === jobId)
    && (!days || Date.parse(a.created_at) >= now - days * 86400000)
    && (!query || `${a.name} ${a.careerId}`.toLowerCase().includes(query)));
}
export function stageLabel(status: string) {
  return HIRING_STAGES.find(s => s.value === status)?.label ?? status;
}