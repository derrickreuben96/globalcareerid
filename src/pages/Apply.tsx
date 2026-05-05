import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Loader2, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface JobView {
  id: string;
  title: string;
  description: string;
  role_category: string | null;
  status: string;
  employer_id: string;
}

interface EmployerInfo {
  id: string;
  company_name: string;
  industry: string | null;
  country: string | null;
  is_verified: boolean;
}

export default function Apply() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, authStatus } = useAuth();
  const jobId = params.get('job_id');
  const companyId = params.get('company_id');

  const [job, setJob] = useState<JobView | null>(null);
  const [employer, setEmployer] = useState<EmployerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const returnPath = useMemo(
    () => `/apply?job_id=${jobId ?? ''}&company_id=${companyId ?? ''}`,
    [jobId, companyId],
  );

  useEffect(() => {
    if (!jobId || !companyId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: jobRows } = await supabase.rpc('get_public_job_for_apply', {
        job_id_param: jobId,
        employer_id_param: companyId,
      });
      const jobData = Array.isArray(jobRows) && jobRows.length > 0 ? jobRows[0] : null;

      if (!jobData) { setLoading(false); return; }
      setJob(jobData as JobView);

      const { data: emp } = await supabase.rpc('get_public_employer_info', {
        employer_id_param: companyId,
      });
      if (emp && emp.length > 0) setEmployer(emp[0] as EmployerInfo);

      if (user) {
        const [{ data: profile }, { data: existing }] = await Promise.all([
          supabase.from('profiles').select('account_type').eq('user_id', user.id).maybeSingle(),
          supabase.from('applications').select('id').eq('job_id', jobId).eq('applicant_user_id', user.id).maybeSingle(),
        ]);
        setAccountType(profile?.account_type ?? null);
        setAlreadyApplied(!!existing);
      }
      setLoading(false);
    };
    load();
  }, [jobId, companyId, user]);

  const handleApply = async () => {
    if (!user || !job) return;
    setSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, account_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) { toast.error('Profile not found'); return; }
      if (profile.account_type !== 'career_individual') {
        toast.error('Only Career Individual accounts can apply for jobs');
        return;
      }

      // Capture immutable employment snapshot
      const { data: records } = await supabase
        .from('employment_records')
        .select('id, job_title, department, employment_type, start_date, end_date, status, employer_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'ended'])
        .order('start_date', { ascending: false });

      const employerIds = Array.from(new Set((records || []).map(r => r.employer_id)));
      const employerMap = new Map<string, string>();
      if (employerIds.length) {
        const { data: emps } = await supabase
          .from('employers').select('id, company_name').in('id', employerIds);
        (emps || []).forEach(e => employerMap.set(e.id, e.company_name));
      }
      const snapshot = (records || []).map(r => ({
        job_title: r.job_title,
        department: r.department,
        employment_type: r.employment_type,
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
        company_name: employerMap.get(r.employer_id) || 'Unknown',
      }));

      const { data: inserted, error } = await supabase.from('applications').insert({
        job_id: job.id,
        employer_id: job.employer_id,
        applicant_user_id: user.id,
        applicant_profile_id: profile.id,
        employment_snapshot: snapshot,
        status: 'submitted',
      }).select('id').maybeSingle();

      if (error) {
        if (error.code === '23505') toast.error('You already applied to this job');
        else toast.error(error.message || 'Failed to submit application');
        return;
      }

      toast.success('Application submitted!');
      setSubmitted(true);
      setAlreadyApplied(true);

      // Fire-and-forget AI scoring (non-blocking)
      if (inserted?.id) {
        supabase.functions.invoke('score-application', { body: { application_id: inserted.id } })
          .catch(() => { /* scoring is best-effort */ });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jobId || !companyId || !job || !employer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
          <div className="glass-card rounded-2xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-3" />
            <h1 className="text-xl font-display font-semibold text-foreground">Invalid apply link</h1>
            <p className="text-sm text-muted-foreground mt-2">The job could not be found or the link is incomplete.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-display font-bold text-foreground">{job.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building2 className="w-4 h-4" />
                  <span>{employer.company_name}</span>
                  {employer.country && <span>• {employer.country}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {job.role_category && <Badge variant="secondary">{job.role_category}</Badge>}
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>{job.status}</Badge>
                </div>
              </div>
            </div>
            <div className="mt-6 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            {job.status !== 'open' && (
              <div className="text-center py-6">
                <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-2" />
                <p className="font-medium">This job is no longer accepting applications.</p>
              </div>
            )}

            {job.status === 'open' && authStatus === 'unauthenticated' && (
              <div className="text-center py-6 space-y-3">
                <p className="text-foreground">Sign in with your Career ID to apply.</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`)}>
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/register?returnTo=${encodeURIComponent(returnPath)}`)}>
                    Create Career ID
                  </Button>
                </div>
              </div>
            )}

            {job.status === 'open' && user && accountType && accountType !== 'career_individual' && (
              <div className="text-center py-6">
                <AlertTriangle className="w-10 h-10 mx-auto text-warning mb-2" />
                <p>Only Career Individual accounts can apply. Please sign in with a candidate account.</p>
              </div>
            )}

            {job.status === 'open' && user && accountType === 'career_individual' && (
              alreadyApplied ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle className="w-10 h-10 mx-auto text-verified" />
                  <p className="font-medium text-foreground">
                    {submitted ? 'Application submitted successfully!' : 'You have already applied to this job.'}
                  </p>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your verified employment history will be securely shared with {employer.company_name}.
                    A snapshot is captured at submission and will not change later.
                  </p>
                  <Button size="lg" onClick={handleApply} disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Apply with Career ID'}
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
