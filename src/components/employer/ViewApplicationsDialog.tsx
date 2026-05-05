import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Sparkles, Users, Star, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'submitted' | 'under_review' | 'shortlisted' | 'interview' | 'hired' | 'rejected';

interface Application {
  id: string;
  status: Status;
  ai_score: number | null;
  confidence_score: number | null;
  ai_explanation: string | null;
  employment_snapshot: any;
  created_at: string;
  applicant_profile: { profile_id: string; first_name: string; last_name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobId: string;
  jobTitle: string;
  screeningQuota: number;
}

const STATUS_LABELS: Record<Status, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
};

export function ViewApplicationsDialog({ open, onOpenChange, jobId, jobTitle, screeningQuota }: Props) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, status, ai_score, confidence_score, ai_explanation, employment_snapshot, created_at,
        applicant_profile:profiles!applications_applicant_profile_id_fkey(profile_id, first_name, last_name)
      `)
      .eq('job_id', jobId)
      .order('ai_score', { ascending: false, nullsFirst: false });
    if (error) {
      // Fallback without the relation hint (FK name may not exist)
      const { data: data2 } = await supabase
        .from('applications')
        .select('id, status, ai_score, confidence_score, ai_explanation, employment_snapshot, created_at, applicant_profile_id')
        .eq('job_id', jobId)
        .order('ai_score', { ascending: false, nullsFirst: false });
      const ids = Array.from(new Set((data2 || []).map((a: any) => a.applicant_profile_id)));
      const profMap = new Map<string, any>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, profile_id, first_name, last_name').in('id', ids);
        (profs || []).forEach(p => profMap.set(p.id, p));
      }
      setApps((data2 || []).map((a: any) => ({ ...a, applicant_profile: profMap.get(a.applicant_profile_id) ?? null })));
    } else {
      setApps((data || []) as unknown as Application[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    fetchApps();
    const ch = supabase
      .channel(`apps-${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `job_id=eq.${jobId}` },
        () => fetchApps())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId]);

  const recommended = useMemo(
    () => [...apps].sort((a, b) => (b.ai_score ?? -1) - (a.ai_score ?? -1)).slice(0, Math.max(1, screeningQuota)),
    [apps, screeningQuota],
  );

  const updateStatus = async (id: string, status: Status) => {
    setUpdating(id);
    const { error } = await supabase.from('applications').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      setUpdating(null);
      return;
    }
    if (status === 'interview') {
      supabase.functions.invoke('notify-interview', { body: { application_id: id } })
        .catch(() => { /* email is best-effort */ });
      toast.success('Interview invitation sent');
    } else {
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
    }
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setUpdating(null);
  };

  const renderRow = (a: Application, showAi: boolean) => (
    <TableRow key={a.id}>
      <TableCell>
        <div className="font-medium">
          {a.applicant_profile ? `${a.applicant_profile.first_name} ${a.applicant_profile.last_name}` : '—'}
        </div>
        <div className="text-xs text-muted-foreground">{a.applicant_profile?.profile_id}</div>
      </TableCell>
      {showAi && (
        <TableCell>
          {a.ai_score != null ? (
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold">{a.ai_score}</span>
              {a.confidence_score != null && (
                <span className="text-xs text-muted-foreground">({a.confidence_score}% conf.)</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Pending</span>
          )}
          {a.ai_explanation && (
            <div className="text-xs text-muted-foreground mt-1 max-w-xs">{a.ai_explanation}</div>
          )}
        </TableCell>
      )}
      <TableCell>
        <Badge variant={a.status === 'rejected' ? 'destructive' : 'secondary'}>
          {STATUS_LABELS[a.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1 flex-wrap">
          <Button size="sm" variant="outline" disabled={updating === a.id || a.status === 'shortlisted'}
            onClick={() => updateStatus(a.id, 'shortlisted')}>
            <Star className="w-3.5 h-3.5" /> Shortlist
          </Button>
          <Button size="sm" variant="outline" disabled={updating === a.id || a.status === 'interview'}
            onClick={() => updateStatus(a.id, 'interview')}>
            <Calendar className="w-3.5 h-3.5" /> Interview
          </Button>
          <Button size="sm" variant="outline" disabled={updating === a.id || a.status === 'hired'}
            onClick={() => updateStatus(a.id, 'hired')}>
            <CheckCircle className="w-3.5 h-3.5" /> Hire
          </Button>
          <Button size="sm" variant="outline" disabled={updating === a.id || a.status === 'rejected'}
            onClick={() => updateStatus(a.id, 'rejected')}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Applications — {jobTitle}</DialogTitle>
          <DialogDescription>
            AI ranks candidates without filtering anyone out. Top {screeningQuota} appear in Recommended.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin inline-block" /></div>
        ) : apps.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No applications yet.</div>
        ) : (
          <Tabs defaultValue="recommended" className="w-full">
            <TabsList>
              <TabsTrigger value="recommended" className="gap-2">
                <Sparkles className="w-4 h-4" /> Recommended ({recommended.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Users className="w-4 h-4" /> All Applicants ({apps.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommended">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{recommended.map(a => renderRow(a, true))}</TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{apps.map(a => renderRow(a, true))}</TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
