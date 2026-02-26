import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface EmploymentRecord {
  id: string;
  job_title: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  employer_id: string;
  employer: {
    company_name: string;
  };
}

interface UpdateRequest {
  id: string;
  employment_record_id: string;
  requested_changes: Record<string, any>;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ExperienceUpdateRequestProps {
  userId: string;
  records: EmploymentRecord[];
}

export function ExperienceUpdateRequest({ userId, records }: ExperienceUpdateRequestProps) {
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EmploymentRecord | null>(null);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('experience_update_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setRequests((data as UpdateRequest[]) || []);
    setIsLoading(false);
  };

  const openDialog = (record: EmploymentRecord) => {
    setSelectedRecord(record);
    setNewJobTitle(record.job_title);
    setNewDepartment(record.department || '');
    setReason('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRecord || !reason.trim()) {
      toast.error('Please provide a reason for the update request');
      return;
    }

    setIsSubmitting(true);
    try {
      const changes: Record<string, any> = {};
      if (newJobTitle !== selectedRecord.job_title) changes.job_title = newJobTitle;
      if (newDepartment !== (selectedRecord.department || '')) changes.department = newDepartment;

      if (Object.keys(changes).length === 0) {
        toast.error('No changes detected');
        return;
      }

      const { error } = await supabase.from('experience_update_requests').insert({
        user_id: userId,
        employment_record_id: selectedRecord.id,
        employer_id: selectedRecord.employer_id,
        requested_changes: { ...changes, reason: reason.trim() },
      });

      if (error) {
        toast.error('Failed to submit request');
        return;
      }

      toast.success('Update request submitted for review');
      setDialogOpen(false);
      fetchRequests();
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning/50"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-verified/10 text-verified"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Experience Update Requests</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Request changes to your employment records. These will be reviewed by your employer or admin.
      </p>

      {/* Active records to request updates for */}
      {records.length > 0 && (
        <div className="space-y-2">
          {records.map(record => (
            <div key={record.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">{record.job_title}</p>
                <p className="text-xs text-muted-foreground">{record.employer?.company_name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openDialog(record)}>
                <Edit className="w-3 h-3" />
                Request Update
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Existing requests */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Your Requests</h4>
          {requests.map(req => (
            <div key={req.id} className="p-3 border border-border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">
                  {Object.entries(req.requested_changes)
                    .filter(([k]) => k !== 'reason')
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </p>
                {statusBadge(req.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(req.created_at).toLocaleDateString()}
              </p>
              {req.admin_notes && (
                <p className="text-xs text-muted-foreground italic">Note: {req.admin_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Experience Update</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Current: <strong>{selectedRecord.job_title}</strong> at {selectedRecord.employer?.company_name}
              </p>
              <div className="space-y-2">
                <Label>New Job Title</Label>
                <Input value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New Department</Label>
                <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reason for Update <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Explain why this update is needed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
