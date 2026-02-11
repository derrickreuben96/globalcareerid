import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Calendar,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface PendingRecord {
  id: string;
  job_title: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  status: string;
  employer: {
    company_name: string;
    is_verified: boolean;
  };
}

interface PendingApprovalsProps {
  onApprovalChange?: () => void;
}

export function PendingApprovals({ onApprovalChange }: PendingApprovalsProps) {
  const { user } = useAuth();
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRecords();
  }, [user]);

  const fetchPendingRecords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employment_records')
      .select(`
        id,
        job_title,
        department,
        employment_type,
        start_date,
        status,
        employer:employers(company_name, is_verified)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending records:', error);
    } else {
      setPendingRecords(data || []);
    }
    setIsLoading(false);
  };

  const handleApproval = async (recordId: string, approve: boolean) => {
    setProcessingId(recordId);

    const { error } = await supabase
      .from('employment_records')
      .update({ status: approve ? 'active' : 'rejected' })
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to process approval');
      setProcessingId(null);
      return;
    }

    toast.success(approve ? 'Employment record approved!' : 'Employment record rejected');
    setPendingRecords(pendingRecords.filter(r => r.id !== recordId));
    setProcessingId(null);
    onApprovalChange?.();
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (pendingRecords.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-6 border-2 border-warning/30 bg-warning/5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-warning" />
        <h3 className="font-semibold text-foreground">
          Pending Approvals ({pendingRecords.length})
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Review and approve employment records added by employers
      </p>

      <div className="space-y-3">
        {pendingRecords.map(record => (
          <div 
            key={record.id}
            className="p-4 bg-background border border-border rounded-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {record.job_title}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {record.employer?.company_name}
                    {record.employer?.is_verified && (
                      <CheckCircle className="w-3 h-3 text-verified" />
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Starts {new Date(record.start_date).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {record.employment_type.replace('_', '-')}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleApproval(record.id, false)}
                  disabled={processingId === record.id}
                >
                  {processingId === record.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleApproval(record.id, true)}
                  disabled={processingId === record.id}
                >
                  {processingId === record.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
