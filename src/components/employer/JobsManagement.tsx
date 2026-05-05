import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Briefcase, Plus, Loader2, Copy, XCircle, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { ViewApplicationsDialog } from './ViewApplicationsDialog';

interface Job {
  id: string;
  title: string;
  description: string;
  role_category: string | null;
  hires_needed: number;
  screening_quota: number;
  status: 'draft' | 'open' | 'closed';
  created_at: string;
  applicant_count?: number;
}

interface JobsManagementProps {
  employerId: string;
  isVerified: boolean;
}

export function JobsManagement({ employerId, isVerified }: JobsManagementProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Job | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    role_category: '',
    hires_needed: 1,
    screening_quota: 10,
  });

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load jobs');
      setJobs([]);
      setLoading(false);
      return;
    }

    const jobList = (data || []) as Job[];
    // Fetch applicant counts per job
    if (jobList.length) {
      const ids = jobList.map(j => j.id);
      const { data: appCounts } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', ids);
      const counts = new Map<string, number>();
      (appCounts || []).forEach((a: { job_id: string }) => {
        counts.set(a.job_id, (counts.get(a.job_id) || 0) + 1);
      });
      jobList.forEach(j => { j.applicant_count = counts.get(j.id) || 0; });
    }
    setJobs(jobList);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    // realtime updates
    const channel = supabase
      .channel(`jobs-${employerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `employer_id=eq.${employerId}` },
        () => fetchJobs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `employer_id=eq.${employerId}` },
        () => fetchJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId]);

  const resetForm = () => setForm({
    title: '', description: '', role_category: '', hires_needed: 1, screening_quota: 10,
  });

  const handleCreate = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || !description) {
      toast.error('Title and description are required');
      return;
    }
    if (form.hires_needed < 1 || form.screening_quota < 1) {
      toast.error('Hires needed and screening quota must be at least 1');
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from('jobs').insert({
      employer_id: employerId,
      created_by: user.id,
      title,
      description,
      role_category: form.role_category.trim() || null,
      hires_needed: form.hires_needed,
      screening_quota: form.screening_quota,
      status: 'open',
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '42501') toast.error('Your company must be verified to create jobs');
      else toast.error('Failed to create job');
      return;
    }
    toast.success('Job created');
    setCreateOpen(false);
    resetForm();
    fetchJobs();
  };

  const buildApplyUrl = (jobId: string) =>
    `${window.location.origin}/apply?job_id=${jobId}&company_id=${employerId}`;

  const handleCopyLink = async (jobId: string) => {
    const ok = await copyToClipboard(buildApplyUrl(jobId));
    if (ok) toast.success('Apply link copied');
    else toast.error('Could not copy');
  };

  const handleClose = async (jobId: string) => {
    const { error } = await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId);
    if (error) { toast.error('Failed to close job'); return; }
    toast.success('Job closed');
    fetchJobs();
  };

  const handleReopen = async (jobId: string) => {
    const { error } = await supabase.from('jobs').update({ status: 'open' }).eq('id', jobId);
    if (error) { toast.error('Failed to reopen job'); return; }
    toast.success('Job reopened');
    fetchJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Jobs Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Post roles and share a unique apply link with candidates
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!isVerified}>
          <Plus className="w-4 h-4" />
          Create Job
        </Button>
      </div>

      {!isVerified && (
        <p className="text-sm text-warning">Your company must be verified before posting jobs.</p>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Applicants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={4} className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin inline-block" />
              </TableCell></TableRow>
            )}
            {!loading && jobs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                No jobs yet. Click "Create Job" to post your first role.
              </TableCell></TableRow>
            )}
            {jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{job.title}</div>
                  {job.role_category && (
                    <div className="text-xs text-muted-foreground">{job.role_category}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {job.applicant_count ?? 0}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button size="sm" variant="outline" disabled title="Coming in next phase">
                      View Applications
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCopyLink(job.id)}>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Apply Link
                    </Button>
                    {job.status === 'open' ? (
                      <Button size="sm" variant="outline" onClick={() => handleClose(job.id)}>
                        <XCircle className="w-3.5 h-3.5" />
                        Close Job
                      </Button>
                    ) : job.status === 'closed' ? (
                      <Button size="sm" variant="outline" onClick={() => handleReopen(job.id)}>
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Job</DialogTitle>
            <DialogDescription>
              Post a new opening. Candidates will apply via a unique link tied to your company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g., Senior Software Engineer"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <Label>Role Category</Label>
              <Input
                placeholder="e.g., Engineering / Marketing / Operations"
                value={form.role_category}
                onChange={(e) => setForm({ ...form, role_category: e.target.value })}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                rows={5}
                placeholder="Responsibilities, requirements, location, etc."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={4000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hires Needed (N) *</Label>
                <Input
                  type="number" min={1}
                  value={form.hires_needed}
                  onChange={(e) => setForm({ ...form, hires_needed: parseInt(e.target.value || '1', 10) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Screening Quota (Y) *</Label>
                <Input
                  type="number" min={1}
                  value={form.screening_quota}
                  onChange={(e) => setForm({ ...form, screening_quota: parseInt(e.target.value || '1', 10) })}
                />
                <p className="text-xs text-muted-foreground">Top Y candidates surfaced as Recommended</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
