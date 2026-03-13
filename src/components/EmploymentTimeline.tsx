import { Building2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TimelineRecord {
  id: string;
  jobTitle: string;
  department?: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  startDate: string;
  endDate?: string;
  status: 'active' | 'ended' | 'disputed' | 'pending';
  employerName: string;
  employerVerified?: boolean;
  employerLogoUrl?: string;
  isDisputed?: boolean;
}

interface EmploymentTimelineProps {
  records: TimelineRecord[];
  showDisputeButton?: boolean;
  onDispute?: (recordId: string) => void;
}

const employmentTypeLabels = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export function EmploymentTimeline({ records, showDisputeButton = false, onDispute }: EmploymentTimelineProps) {
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years} yr ${remainingMonths} mo` : `${years} years`;
  };

  return (
    <div className="space-y-6">
      {sortedRecords.map((record, index) => (
        <div 
          key={record.id} 
          className={cn(
            "relative pl-8 pb-6",
            index !== sortedRecords.length - 1 && "border-l-2 border-border ml-3"
          )}
        >
          {/* Timeline dot */}
          <div className={cn(
            "absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center",
            record.status === 'active' 
              ? "bg-verified text-verified-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            {record.status === 'active' ? (
              <div className="w-2 h-2 bg-verified-foreground rounded-full animate-pulse-soft" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Content */}
          <div className="glass-card rounded-xl p-5 ml-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{record.jobTitle}</h3>
                  {record.status === 'active' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-verified/10 text-verified font-medium">
                      Current
                    </span>
                  )}
                  {record.isDisputed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Disputed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  {record.employerLogoUrl ? (
                    <img src={record.employerLogoUrl} alt={record.employerName} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span className="font-medium text-foreground/80">{record.employerName}</span>
                  {record.employerVerified && <VerifiedBadge variant="inline" />}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(record.startDate)} — {record.endDate ? formatDate(record.endDate) : 'Present'}
                    </span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{calculateDuration(record.startDate, record.endDate)}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{employmentTypeLabels[record.employmentType]}</span>
                </div>

                {record.department && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Department: {record.department}
                  </p>
                )}
              </div>
            </div>

            {showDisputeButton && !record.isDisputed && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-warning"
                  onClick={() => onDispute?.(record.id)}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Report Issue
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
