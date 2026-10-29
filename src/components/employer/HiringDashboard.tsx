import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Calendar, CheckCircle, Clock, History, LayoutGrid, List, Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ViewApplicationsDialog } from './ViewApplicationsDialog';
import { filterHiringApplications, hiringStats, HIRING_STAGES, stageLabel, type HiringApplication, type RecruitmentEvent } from '@/lib/hiringPipeline';

interface HiringJob {
  id: string;
  title: string;
  status: string;
  hires_needed: number;
  screening_quota: number;
  created_at: string;
}
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function HiringDashboard({ employerId, onManageJobs }: { employerId: string; onManageJobs: () => void }) {
  const [jobs, setJobs] = useState<HiringJob[]>([]);
  const [apps, setApps] = useState<HiringApplication[]>([]);
  const [events, setEvents] = useState<RecruitmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [jobFilter, setJobFilter] = useState('all');
  const [period, setPeriod] = useState('0');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<HiringJob | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [jobResult, appResult, eventResult] = await Promise.all([
        supabase.from('jobs').select('id,title,status,hires_needed,screening_quota,created_at').eq('employer_id', employerId).order('created_at', { ascending: false }),
        supabase.from('applications').select('id,job_id,status,created_at,updated_at,interview_at,interview_notes,ai_score').eq('employer_id', employerId).order('created_at', { ascending: false }),
        supabase.from('recruitment_events').select('id,application_id,event_type,from_status,to_status,interview_at,occurred_at').eq('employer_id', employerId).order('occurred_at', { ascending: false }).limit(500),
      ]);
      if (jobResult.error || appResult.error || eventResult.error) throw new Error('Hiring data unavailable');
      const jobRows = jobResult.data ?? [];
      const applicantJobIds = [...new Set((appResult.data ?? []).map(a => a.job_id))];
      const identities = await Promise.all(applicantJobIds.map(id => supabase.rpc('get_job_applicants', { job_id_param: id })));
      if (identities.some(result => result.error)) throw new Error('Candidate details unavailable');
      const names = new Map(identities.flatMap(result => result.data ?? []).map(a => [a.application_id, a]));
      setJobs(jobRows);
      setApps((appResult.data ?? []).map(a => {
        const identity = names.get(a.id);
        return { ...a, name: identity ? `${identity.first_name} ${identity.last_name}`.trim() : 'Candidate unavailable', careerId: identity?.profile_id ?? '' };
      }));
      setEvents(eventResult.data ?? []);
      setNow(Date.now());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employerId]);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(() => { if (!document.hidden) void fetchData(); }, 30000);
    const onFocus = () => { void fetchData(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [fetchData]);

  const filtered = useMemo(() => filterHiringApplications(apps, jobFilter, search, Number(period), now), [apps, jobFilter, search, period, now]);
  const stats = hiringStats(filtered, now);
  const jobMap = new Map(jobs.map(j => [j.id, j]));
  const appMap = new Map(filtered.map(a => [a.id, a]));
  const upcoming = filtered.filter(a => a.status === 'interview').sort((a, b) => (a.interview_at ? Date.parse(a.interview_at) : Infinity) - (b.interview_at ? Date.parse(b.interview_at) : Infinity));
  const timeline = [
    ...events.filter(e => appMap.has(e.application_id)).map(e => {
      const a = appMap.get(e.application_id);
      const label = e.event_type === 'submitted' ? 'Applied' : e.event_type === 'current_status' ? `Recorded status: ${stageLabel(e.to_status)}` : e.event_type === 'interview_scheduled' ? 'Interview scheduled or updated' : `${stageLabel(e.from_status ?? 'submitted')} → ${stageLabel(e.to_status)}`;
      return { id: e.id, at: e.occurred_at, label, detail: `${a?.name ?? 'Candidate'} · ${jobMap.get(a?.job_id ?? '')?.title ?? 'Job unavailable'}`, interview: e.interview_at };
    }),
    ...jobs.filter(j => (jobFilter === 'all' || j.id === jobFilter) && !search.trim() && (!Number(period) || Date.parse(j.created_at) >= now - Number(period) * 86400000)).map(j => ({ id: `job-${j.id}`, at: j.created_at, label: 'Job created', detail: j.title, interview: null })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 50);

  const openApplicants = (jobId: string) => {
    const job = jobMap.get(jobId);
    if (job) setViewing(job);
  };

  const candidateCard = (a: HiringApplication) => (
    <article key={a.id} className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold" aria-hidden="true">{a.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
        <div className="min-w-0"><p className="font-semibold text-sm break-words">{a.name}</p><p className="text-xs text-muted-foreground break-all">{a.careerId}</p></div>
      </div>
      <p className="text-sm break-words">{jobMap.get(a.job_id)?.title ?? 'Job unavailable'}</p>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Applied {dateOnly(a.created_at)}</p>
        {a.ai_score !== null && <p>Match score: {a.ai_score}</p>}
        {a.status === 'interview' && <p className="text-accent flex items-start gap-1"><Calendar className="h-3.5 w-3.5 shrink-0" />{a.interview_at ? dateTime(a.interview_at) : 'Date not scheduled'}</p>}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => openApplicants(a.job_id)}>View applicants</Button>
    </article>
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-display font-semibold flex items-center gap-2"><Briefcase className="h-6 w-6 text-accent" />Hiring Dashboard</h2>
        <div className="flex gap-2"><Button variant="outline" size="icon" title="Refresh hiring dashboard" aria-label="Refresh hiring dashboard" disabled={refreshing} onClick={() => void fetchData()}><RefreshCw className={refreshing ? 'animate-spin' : ''} /></Button><Button onClick={onManageJobs}><Briefcase />Manage jobs</Button></div>
      </div>
      {error && <div role="alert" className="border border-destructive rounded-lg p-4 text-destructive flex flex-wrap items-center justify-between gap-2"><p>Hiring data could not be refreshed. Please try again.</p><Button variant="outline" onClick={() => void fetchData()}>Retry</Button></div>}
      {loading ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin" aria-label="Loading hiring dashboard" /></div> : <>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 w-full sm:w-64"><Label htmlFor="hiring-job">Job</Label><Select value={jobFilter} onValueChange={setJobFilter}><SelectTrigger id="hiring-job"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All jobs</SelectItem>{jobs.map(j => <SelectItem value={j.id} key={j.id}>{j.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 w-full sm:w-44"><Label htmlFor="hiring-period">Applied within</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger id="hiring-period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">All time</SelectItem><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5 flex-1 min-w-48"><Label htmlFor="hiring-search">Candidate</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="hiring-search" className="pl-9" placeholder="Name or Career ID" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ label: 'Applicants', value: stats.applicants, detail: `${stats.active} in progress`, icon: Users }, { label: 'Interviews', value: stats.interviews, detail: `${stats.upcoming} upcoming`, icon: Calendar }, { label: 'Hires', value: stats.hired, detail: 'Confirmed hiring decisions', icon: CheckCircle }, { label: 'Hire rate', value: `${stats.conversion}%`, detail: 'Hires / applicants', icon: Briefcase }].map(s => <div key={s.label} className="border border-border rounded-lg bg-card p-4"><div className="flex items-center justify-between gap-2 text-muted-foreground"><p className="text-sm">{s.label}</p><s.icon className="h-4 w-4 text-accent" /></div><p className="text-3xl font-display font-semibold mt-2">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.detail}</p></div>)}
        </div>
        <Tabs defaultValue="pipeline">
          <TabsList className="max-w-full h-auto flex flex-wrap justify-start w-fit"><TabsTrigger value="pipeline" className="gap-2"><LayoutGrid className="h-4 w-4" />Pipeline</TabsTrigger><TabsTrigger value="interviews" className="gap-2"><Calendar className="h-4 w-4" />Interviews</TabsTrigger><TabsTrigger value="timeline" className="gap-2"><History className="h-4 w-4" />Timeline</TabsTrigger><TabsTrigger value="jobs" className="gap-2"><List className="h-4 w-4" />Job progress</TabsTrigger></TabsList>
          <TabsContent value="pipeline" className="mt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start">
              {HIRING_STAGES.map(stage => {
                const members = filtered.filter(a => a.status === stage.value);
                return <section key={stage.value} className="min-w-0"><div className={`border-t-4 ${stage.value === 'hired' ? 'border-success' : stage.value === 'rejected' ? 'border-destructive' : stage.value === 'interview' ? 'border-accent' : 'border-primary'} flex items-center justify-between gap-2 py-3`}><h3 className="text-sm font-semibold">{stage.label}</h3><Badge variant="secondary">{members.length}</Badge></div><div className="space-y-3 max-h-[650px] overflow-y-auto">{members.map(candidateCard)}{members.length === 0 && <p className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">No candidates</p>}</div></section>;
              })}
            </div>
          </TabsContent>
          <TabsContent value="interviews" className="mt-5">
            <h3 className="font-semibold mb-4">Interview schedule <span className="text-xs font-normal text-muted-foreground">· {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></h3>
            {upcoming.length === 0 ? <p className="py-12 text-center text-muted-foreground">No interviews in this selection.</p> : <div className="divide-y divide-border">{upcoming.map(a => <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4"><div className="min-w-0 space-y-1"><p className="font-semibold break-words">{a.name}</p><p className="text-sm text-muted-foreground break-words">{jobMap.get(a.job_id)?.title} · {a.careerId}</p><p className="text-sm text-accent">{a.interview_at ? dateTime(a.interview_at) : 'Date not scheduled'}</p>{a.interview_at && Date.parse(a.interview_at) < now && <Badge variant="secondary">Past scheduled date</Badge>}{a.interview_notes && <p className="text-sm whitespace-pre-wrap break-words">{a.interview_notes}</p>}</div><Button variant="outline" size="sm" onClick={() => openApplicants(a.job_id)}><Calendar />Manage interview</Button></div>)}</div>}
          </TabsContent>
          <TabsContent value="timeline" className="mt-5">
            <h3 className="font-semibold mb-4">Recruitment timeline</h3>
            {timeline.length === 0 ? <p className="py-12 text-center text-muted-foreground">No recruitment activity in this selection.</p> : <ol className="border-l border-border ml-2">{timeline.map(e => <li key={e.id} className="relative pl-6 pb-6"><span className="absolute -left-2 top-0.5 rounded-full bg-background text-accent"><Clock className="h-4 w-4" /></span><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-sm">{e.label}</p><time className="text-xs text-muted-foreground" dateTime={e.at}>{dateTime(e.at)}</time></div><p className="text-sm text-muted-foreground break-words mt-1">{e.detail}</p>{e.interview && <p className="text-xs text-accent mt-1">Interview: {dateTime(e.interview)}</p>}</li>)}</ol>}
          </TabsContent>
          <TabsContent value="jobs" className="mt-5">
            <div className="divide-y divide-border">{jobs.filter(j => jobFilter === 'all' || j.id === jobFilter).map(j => {
              const jobApps = filtered.filter(a => a.job_id === j.id);
              const hires = jobApps.filter(a => a.status === 'hired').length;
              return <div key={j.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"><div className="flex-1 min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold break-words">{j.title}</h3><Badge variant="secondary">{j.status}</Badge></div><p className="text-sm text-muted-foreground">{jobApps.length} applicants · {hires} / {j.hires_needed} hires</p><Progress value={Math.min(100, hires / Math.max(1, j.hires_needed) * 100)} aria-label={`${j.title} hiring progress`} className="max-w-md h-2" /></div><Button variant="outline" onClick={() => setViewing(j)}>View applicants</Button></div>;
            })}{jobs.length === 0 && <p className="text-center py-12 text-muted-foreground">No jobs posted yet.</p>}</div>
          </TabsContent>
        </Tabs>
      </>}
      {viewing && <ViewApplicationsDialog open onOpenChange={open => { if (!open) { setViewing(null); void fetchData(); } }} jobId={viewing.id} jobTitle={viewing.title} screeningQuota={viewing.screening_quota} onApplicationsChange={() => void fetchData()} />}
    </div>
  );
}