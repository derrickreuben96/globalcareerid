import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Loader2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateRequest {
  id: string;
  user_id: string;
  employment_record_id: string;
  employer_id: string;
  requested_changes: Record<string, any>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
  user_profile_id?: string;
  job_title?: string;
}

interface EmployerExperienceRequestsProps {
  employerId: string;
}

export function EmployerExperienceRequests({ employerId }: EmployerExperienceRequestsProps) {
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UpdateRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [employerId]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('experience_update_requests')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) { setIsLoading(false); return; }

    const userIds = [...new Set(data.map(d => d.user_id))];
    const recordIds = [...new Set(data.map(d => d.employment_record_id))];

    const [profilesRes, recordsRes] = await Promise.all([
      supabase.from('profiles').select('user_id, first_name, last_name, profile_id').in('user_id', userIds),
      supabase.from('employment_records').select('id, job_title').in('id', recordIds),
    ]);

    const enriched: UpdateRequest[] = data.map(req => {
      const profile = profilesRes.data?.find(p => p.user_id === req.user_id);
      const record = recordsRes.data?.find(r => r.id === req.employment_record_id);
      return {
        ...req,
        requested_changes: (typeof req.requested_changes === 'object' && req.requested_changes !== null ? req.requested_changes : {}) as Record<string, any>,
        user_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
        user_profile_id: profile?.profile_id,
        job_title: record?.job_title,
      };
    });

    setRequests(enriched);
    setIsLoading(false);
  };

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('experience_update_requests')
        .update({
          status: action,
          admin_notes: notes.trim() || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) { toast.error('Failed to update request'); return; }

      if (action === 'approved') {
        const changes = { ...selectedRequest.requested_changes };
        delete changes.reason;
        if (Object.keys(changes).length > 0) {
          const { error: recordError } = await supabase
            .from('employment_records')
            .update(changes)
            .eq('id', selectedRequest.employment_record_id);
          if (recordError) { toast.error('Approved but failed to update record'); return; }
        }
      }

      // Create in-app notification for the employee
      await supabase.from('in_app_notifications').insert({
        user_id: selectedRequest.user_id,
        title: action === 'approved' ? 'Experience Update Approved' : 'Experience Update Declined',
        message: action === 'approved'
          ? `Your experience update request has been approved. Changes have been applied to your record.`
          : `Your experience update request has been declined.${notes.trim() ? ` Reason: ${notes.trim()}` : ''}`,
        type: action === 'approved' ? 'success' : 'warning',
        link: '/dashboard',
      });

      // Send email notification
      try {
        const session = await supabase.auth.getSession();
        await supabase.functions.invoke('notify-experience-decision', {
          body: { request_id: selectedRequest.id, decision: action, admin_notes: notes.trim() || null },
          headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
        });
      } catch (e) { console.warn('Email notification failed:', e); }

      toast.success(`Request ${action}`);
      setSelectedRequest(null);
      setNotes('');
      fetchRequests();
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            Experience Update Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Review and approve employee role/experience change requests
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-warning border-warning/50">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Edit className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No experience update requests from your employees.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Requested Changes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Badge variant="outline" className="text-warning border-warning/50">
                        <Clock className="w-3 h-3 mr-1" />Pending
                      </Badge>
                    )}
                    {req.status === 'approved' && (
                      <Badge className="bg-verified/10 text-verified">
                        <CheckCircle className="w-3 h-3 mr-1" />Approved
                      </Badge>
                    )}
                    {req.status === 'rejected' && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />Rejected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{req.user_name}</p>
                      <p className="text-xs text-muted-foreground">{req.user_profile_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{req.job_title}</TableCell>
                  <TableCell className="text-sm">
                    {Object.entries(req.requested_changes)
                      .filter(([k]) => k !== 'reason')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedRequest(req); setNotes(''); }}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Update Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Role</p>
                  <p className="font-medium">{selectedRequest.job_title}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Requested Changes</p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {Object.entries(selectedRequest.requested_changes).map(([k, v]) => (
                    <p key={k} className="text-sm">
                      <span className="font-medium">{k}:</span> {String(v)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Notes (optional)</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleAction('rejected')} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </Button>
            <Button onClick={() => handleAction('approved')} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
