import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, ArrowUpRight, ArrowRight, ArrowDownRight, Calendar } from 'lucide-react';

interface PromotionRequest {
  id: string;
  employment_record_id: string;
  employee_id: string;
  proposed_role_title: string;
  proposed_department: string | null;
  effective_date: string;
  promotion_type: string;
  status: string;
  reviewer_remarks: string | null;
  created_at: string;
  employee_name?: string;
  current_role?: string;
}

interface PendingPromotionsProps {
  employerId: string;
}

const typeIcons: Record<string, any> = {
  promotion: ArrowUpRight,
  lateral: ArrowRight,
  demotion: ArrowDownRight,
};

const typeColors: Record<string, string> = {
  promotion: 'bg-verified/10 text-verified',
  lateral: 'bg-primary/10 text-primary',
  demotion: 'bg-warning/10 text-warning',
};

export function PendingPromotions({ employerId }: PendingPromotionsProps) {
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    // Get employment records for this employer
    const { data: empRecords } = await supabase
      .from('employment_records')
      .select('id, job_title, user_id')
      .eq('employer_id', employerId);

    if (!empRecords?.length) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const recordIds = empRecords.map(r => r.id);
    const { data: promoData, error } = await supabase
      .from('promotion_requests')
      .select('*')
      .in('employment_record_id', recordIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Enrich with employee names
    const userIds = [...new Set((promoData || []).map(p => p.employee_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', userIds)
      : { data: [] };

    const enriched = (promoData || []).map(p => {
      const profile = profiles?.find(pr => pr.user_id === p.employee_id);
      const empRec = empRecords.find(r => r.id === p.employment_record_id);
      return {
        ...p,
        employee_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
        current_role: empRec?.job_title || '',
      };
    });

    setRequests(enriched);
    setLoading(false);
  }, [employerId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async () => {
    if (!actionId || !actionType) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (actionType === 'approve') {
        const { error } = await supabase.rpc('approve_promotion', {
          request_id_param: actionId,
          approver_id: user.id,
        });
        if (error) throw error;
        toast.success('Promotion approved');
      } else {
        const { error } = await supabase
          .from('promotion_requests')
          .update({
            status: 'rejected',
            reviewed_by: user.id,
            review_timestamp: new Date().toISOString(),
            reviewer_remarks: remarks || null,
          } as any)
          .eq('id', actionId);
        if (error) throw error;

        // Get request details for notification
        const req = requests.find(r => r.id === actionId);
        if (req) {
          await supabase.from('in_app_notifications').insert({
            user_id: req.employee_id,
            title: 'Role Update Rejected',
            message: `Your request for ${req.proposed_role_title} was rejected.${remarks ? ' Remarks: ' + remarks : ''}`,
            type: 'warning',
            link: '/dashboard',
          });
        }
        toast.success('Request rejected');
      }

      setActionId(null);
      setActionType(null);
      setRemarks('');
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const pending = requests.filter(r => r.status === 'pending');
  const processed = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-semibold text-foreground">Pending Role Updates</h2>

      {pending.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No pending role update requests.</p>
      ) : (
        <div className="space-y-4">
          {pending.map(req => {
            const Icon = typeIcons[req.promotion_type] || ArrowRight;
            return (
              <div key={req.id} className="p-5 border border-border rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{req.employee_name}</h3>
                      <Badge className={typeColors[req.promotion_type] || ''}>
                        <Icon className="w-3 h-3 mr-1" />
                        {req.promotion_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {req.current_role} → <span className="font-medium text-foreground">{req.proposed_role_title}</span>
                    </p>
                    {req.proposed_department && (
                      <p className="text-sm text-muted-foreground">Department: {req.proposed_department}</p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Effective: {new Date(req.effective_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-verified border-verified hover:bg-verified/10" onClick={() => { setActionId(req.id); setActionType('approve'); }}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => { setActionId(req.id); setActionType('reject'); }}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {processed.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Processed Requests</h3>
          <div className="space-y-3">
            {processed.slice(0, 10).map(req => (
              <div key={req.id} className="p-4 border border-border rounded-xl opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{req.employee_name}</span>
                    <span className="text-muted-foreground"> — {req.proposed_role_title}</span>
                  </div>
                  <Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>
                    {req.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!actionId} onOpenChange={() => { setActionId(null); setActionType(null); setRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve Promotion' : 'Reject Request'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {actionType === 'approve' ? (
              <p className="text-muted-foreground">This will close the current active role and create a new role entry. Continue?</p>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">Add a remark (optional):</p>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionId(null); setActionType(null); }}>Cancel</Button>
            <Button onClick={handleAction} disabled={processing} variant={actionType === 'approve' ? 'default' : 'destructive'}>
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
