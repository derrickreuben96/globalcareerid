import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Plus, 
  Pencil, 
  Trash2,
  Loader2,
  History
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
  performer_name: string;
}

interface AuditLogViewerProps {
  employerId: string;
}

export function AuditLogViewer({ employerId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.rpc('get_employer_audit_logs', {
        employer_id_param: employerId,
      });

      if (error) {
        console.error('Failed to fetch audit logs');
      } else {
        setLogs((data as AuditLog[]) || []);
      }
      setIsLoading(false);
    };

    fetchLogs();
  }, [employerId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="w-4 h-4 text-verified" />;
      case 'UPDATE':
        return <Pencil className="w-4 h-4 text-warning" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-verified/10 text-verified">Created</Badge>;
      case 'UPDATE':
        return <Badge className="bg-warning/10 text-warning">Updated</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatChange = (log: AuditLog) => {
    if (log.action === 'INSERT' && log.new_data) {
      const data = log.new_data as Record<string, unknown>;
      return `Added ${data.job_title || 'record'} for employee`;
    }
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const oldData = log.old_data as Record<string, unknown>;
      const newData = log.new_data as Record<string, unknown>;
      const changes: string[] = [];
      
      if (oldData.status !== newData.status) {
        changes.push(`status: ${oldData.status} → ${newData.status}`);
      }
      if (oldData.end_date !== newData.end_date && newData.end_date) {
        changes.push(`ended employment`);
      }
      if (oldData.job_title !== newData.job_title) {
        changes.push(`title: ${oldData.job_title} → ${newData.job_title}`);
      }
      
      return changes.length > 0 ? changes.join(', ') : 'Record updated';
    }
    if (log.action === 'DELETE' && log.old_data) {
      const data = log.old_data as Record<string, unknown>;
      return `Removed ${data.job_title || 'record'}`;
    }
    return 'Record modified';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No activity logged yet.</p>
        <p className="text-sm">Changes to employment records will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-4 border border-border rounded-xl flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {getActionIcon(log.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getActionBadge(log.action)}
              <span className="text-sm text-muted-foreground">
                by {log.performer_name}
              </span>
            </div>
            <p className="text-foreground">{formatChange(log)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(log.performed_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
