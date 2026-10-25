import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase, Loader2, Calendar, MapPin, CheckCircle2, Circle,
  FileText, Star, Video, Award,
} from 'lucide-react';

interface AppliedJob {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  interview_at: string | null;
  interview_notes: string | null;
  job: { title: string; location: string | null } | null;
  employer: { company_name: string; logo_url: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Not Selected',
};

// Ordered pipeline for the progress stepper (rejected handled separately)
const PIPELINE = ['submitted', 'under_review', 'shortlisted', 'interview', 'hired'];

const PIPELINE_LABELS: Record<string, string> = {
  submitted: 'Applied',
  under_review: 'Review',
  shortlisted: 'Shortlist',
  interview: 'Interview',
  hired: 'Hired',
};

interface Props { userId: string }

export function AppliedJobsTracker({ userId }: Props) {
  const [rows, setRows] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('id, status, created_at, updated_at, interview_at, interview_notes, job:jobs(title, location), employer:employers(company_name, logo_url)')
      .eq('applicant_user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load applications', error);
      setRows([]);
    } else {
      setRows((data || []) as unknown as AppliedJob[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
    const channel = supabase
      .channel(`applications-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `applicant_user_id=eq.${userId}` },
        () => fetchApplications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const stats = useMemo(() => ({
    total: rows.length,
    inProgress: rows.filter(r => ['submitted', 'under_review', 'shortlisted'].includes(r.status)).length,
    interviews: rows.filter(r => r.status === 'interview').length,
    hired: rows.filter(r => r.status === 'hired').length,
  }), [rows]);

  const upcomingInterviews = useMemo(
    () => rows
      .filter(r => r.status === 'interview' && r.interview_at && new Date(r.interview_at) > new Date())
      .sort((a, b) => new Date(a.interview_at!).getTime() - new Date(b.interview_at!).getTime()),
    [rows],
  );

  const statCards = [
    { label: 'Applied', value: stats.total, icon: FileText },
    { label: 'In Progress', value: stats.inProgress, icon: Briefcase },
    { label: 'Interviews', value: stats.interviews, icon: Calendar },
    { label: 'Hired', value: stats.hired, icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming interviews */}
      {upcomingInterviews.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-primary">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-primary" />
            Upcoming Interviews
          </h3>
          <div className="space-y-3">
            {upcomingInterviews.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-primary/5">
                <div>
                  <p className="font-medium text-foreground">{r.job?.title ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">{r.employer?.company_name ?? '—'}</p>
                  {r.interview_notes && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.interview_notes}</p>
                  )}
                </div>
                <Badge className="gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(r.interview_at!).toLocaleString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications list */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            My Applications
          </h2>
          <p className="text-sm text-muted-foreground">
            Live status of every role you've applied to with your Career ID
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">You haven't applied to any jobs yet.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/jobs">Browse open roles</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(row => {
              const isRejected = row.status === 'rejected';
              const currentStep = PIPELINE.indexOf(row.status);
              return (
                <article key={row.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {row.employer?.logo_url ? (
                          <img src={row.employer.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Briefcase className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">{row.job?.title ?? '—'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {row.employer?.company_name ?? '—'}
                          {row.job?.location ? ` · ${row.job.location}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isRejected ? 'destructive' : row.status === 'hired' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </div>

                  {/* Progress stepper */}
                  {!isRejected && (
                    <div className="flex items-center mt-4">
                      {PIPELINE.map((step, i) => {
                        const reached = currentStep >= i;
                        return (
                          <div key={step} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1">
                              {reached ? (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground/40" />
                              )}
                              <span className={`text-[10px] whitespace-nowrap ${reached ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}>
                                {PIPELINE_LABELS[step]}
                              </span>
                            </div>
                            {i < PIPELINE.length - 1 && (
                              <div className={`h-px flex-1 mx-1 mb-4 ${currentStep > i ? 'bg-primary' : 'bg-border'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Interview details */}
                  {row.status === 'interview' && (row.interview_at || row.interview_notes) && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 text-sm space-y-1">
                      {row.interview_at && (
                        <p className="flex items-center gap-2 text-foreground font-medium">
                          <Calendar className="w-4 h-4 text-primary" />
                          {new Date(row.interview_at).toLocaleString(undefined, {
                            weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      )}
                      {row.interview_notes && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{row.interview_notes}</p>
                      )}
                    </div>
                  )}

                  {row.status === 'hired' && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
                      <Star className="w-4 h-4 text-primary" />
                      Congratulations — this employer marked you as hired.
                    </p>
                  )}
                  {isRejected && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      This application wasn't successful — your Career ID keeps working for you on the next one.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
