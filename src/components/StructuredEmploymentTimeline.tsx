import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, ArrowUpRight, ArrowRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface RoleEntry {
  id: string;
  role_title: string;
  department: string | null;
  role_start_date: string;
  role_end_date: string | null;
  promotion_type: string;
}

interface GroupedEmployment {
  employerName: string;
  employerVerified: boolean;
  startDate: string;
  endDate: string | null;
  status: string;
  roles: RoleEntry[];
}

interface StructuredEmploymentTimelineProps {
  userId: string;
}

const typeIcons: Record<string, any> = {
  promotion: ArrowUpRight,
  lateral: ArrowRight,
  demotion: ArrowDownRight,
  initial: null,
};

const typeLabels: Record<string, string> = {
  promotion: 'Promoted',
  lateral: 'Lateral Move',
  demotion: 'Demoted',
  initial: 'Joined',
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export function StructuredEmploymentTimeline({ userId }: StructuredEmploymentTimelineProps) {
  const [groups, setGroups] = useState<GroupedEmployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get employment records with employer info
      const { data: records } = await supabase
        .from('employment_records')
        .select('id, job_title, department, start_date, end_date, status, employer:employers(company_name, is_verified)')
        .eq('user_id', userId)
        .in('status', ['active', 'ended'])
        .order('start_date', { ascending: false });

      if (!records?.length) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Get role history for all records
      const recordIds = records.map(r => r.id);
      const { data: roles } = await supabase
        .from('role_history')
        .select('*')
        .in('employment_record_id', recordIds)
        .order('role_start_date', { ascending: true });

      const grouped: GroupedEmployment[] = records.map(r => ({
        employerName: (r.employer as any)?.company_name || 'Unknown',
        employerVerified: (r.employer as any)?.is_verified || false,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status || 'active',
        roles: (roles || [])
          .filter(role => role.employment_record_id === r.id)
          .map(role => ({
            id: role.id,
            role_title: role.role_title,
            department: role.department,
            role_start_date: role.role_start_date,
            role_end_date: role.role_end_date,
            promotion_type: role.promotion_type,
          })),
      }));

      setGroups(grouped);
      setLoading(false);
    };

    fetch();
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (groups.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No structured employment history available.</p>;
  }

  return (
    <div className="space-y-8">
      {groups.map((group, gi) => (
        <div key={gi} className="glass-card rounded-xl p-5">
          {/* Company header */}
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-lg">{group.employerName}</h3>
            {group.employerVerified && <VerifiedBadge variant="inline" />}
            <span className="text-sm text-muted-foreground ml-auto">
              {formatDate(group.startDate)} — {group.endDate ? formatDate(group.endDate) : 'Present'}
            </span>
          </div>

          {/* Role history */}
          {group.roles.length > 0 ? (
            <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
              {group.roles.map((role, ri) => {
                const Icon = typeIcons[role.promotion_type];
                return (
                  <div key={role.id} className="relative">
                    {/* Dot */}
                    <div className={cn(
                      "absolute -left-[31px] w-4 h-4 rounded-full border-2",
                      !role.role_end_date ? "bg-verified border-verified" : "bg-muted border-border"
                    )} />

                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{role.role_title}</span>
                          {role.promotion_type !== 'initial' && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              {Icon && <Icon className="w-3 h-3" />}
                              {typeLabels[role.promotion_type]}
                            </Badge>
                          )}
                          {!role.role_end_date && (
                            <Badge className="bg-verified/10 text-verified text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(role.role_start_date)} — {role.role_end_date ? formatDate(role.role_end_date) : 'Present'}
                          {role.department && <span>• {role.department}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground ml-4">No role history recorded yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
