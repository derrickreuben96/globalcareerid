import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Briefcase, Loader2 } from 'lucide-react';

interface AppliedJob {
  id: string;
  status: string;
  updated_at: string;
  ai_score: number | null;
  job: { title: string } | null;
  employer: { company_name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Not Selected',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  hired: 'default',
  shortlisted: 'default',
  interview: 'default',
  rejected: 'destructive',
};

interface Props { userId: string }

export function AppliedJobsTracker({ userId }: Props) {
  const [rows, setRows] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('id, status, updated_at, ai_score, job:jobs(title), employer:employers(company_name)')
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

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Applied Jobs Tracker
        </h2>
        <p className="text-sm text-muted-foreground">
          Live status of every role you've applied to with your Career ID
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={4} className="text-center py-8">
                <Loader2 className="w-5 h-5 animate-spin inline-block" />
              </TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                You haven't applied to any jobs yet.
              </TableCell></TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.job?.title ?? '—'}</TableCell>
                <TableCell>{row.employer?.company_name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status] ?? 'secondary'}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(row.updated_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
