import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Clock, Users, AlertTriangle } from 'lucide-react';

interface EmployerAnalyticsProps {
  employerId: string;
}

export function EmployerAnalytics({ employerId }: EmployerAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    promotionRate: 0,
    avgTenureBeforePromo: 0,
    stagnantRoles: 0,
    totalEmployees: 0,
    departmentBreakdown: [] as { department: string; promos: number }[],
  });

  useEffect(() => {
    const fetch = async () => {
      const { data: records } = await supabase
        .from('employment_records')
        .select('id, start_date, end_date, department, user_id')
        .eq('employer_id', employerId);

      if (!records?.length) { setLoading(false); return; }

      const recordIds = records.map(r => r.id);
      const { data: roles } = await supabase
        .from('role_history')
        .select('*')
        .in('employment_record_id', recordIds)
        .order('role_start_date', { ascending: true });

      const allRoles = roles || [];
      const promotions = allRoles.filter(r => r.promotion_type === 'promotion');
      const now = new Date();

      // Promotion rate
      const uniqueEmployees = new Set(records.map(r => r.user_id));
      const employeesWithPromo = new Set(promotions.map(p => {
        const rec = records.find(r => r.id === p.employment_record_id);
        return rec?.user_id;
      }));
      const promoRate = uniqueEmployees.size ? (employeesWithPromo.size / uniqueEmployees.size) * 100 : 0;

      // Avg tenure before promotion
      let totalTenureBeforePromo = 0;
      promotions.forEach(p => {
        const rec = records.find(r => r.id === p.employment_record_id);
        if (rec) {
          const start = new Date(rec.start_date);
          const promoDate = new Date(p.role_start_date);
          totalTenureBeforePromo += (promoDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
        }
      });
      const avgTenure = promotions.length ? totalTenureBeforePromo / promotions.length : 0;

      // Stagnant roles (active roles > 36 months without change)
      const activeRoles = allRoles.filter(r => !r.role_end_date);
      const stagnant = activeRoles.filter(r => {
        const months = (now.getTime() - new Date(r.role_start_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months > 36;
      });

      // Department breakdown
      const deptMap = new Map<string, number>();
      promotions.forEach(p => {
        const dept = p.department || 'Unspecified';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });

      setMetrics({
        promotionRate: Math.round(promoRate),
        avgTenureBeforePromo: Math.round(avgTenure),
        stagnantRoles: stagnant.length,
        totalEmployees: uniqueEmployees.size,
        departmentBreakdown: Array.from(deptMap.entries()).map(([department, promos]) => ({ department, promos })),
      });
      setLoading(false);
    };

    fetch();
  }, [employerId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const formatDuration = (months: number) => {
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-semibold text-foreground">Workforce Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-border rounded-xl text-center">
          <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold text-foreground">{metrics.totalEmployees}</p>
          <p className="text-xs text-muted-foreground">Total Employees</p>
        </div>
        <div className="p-4 border border-border rounded-xl text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-verified" />
          <p className="text-2xl font-bold text-foreground">{metrics.promotionRate}%</p>
          <p className="text-xs text-muted-foreground">Promotion Rate</p>
        </div>
        <div className="p-4 border border-border rounded-xl text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold text-foreground">{formatDuration(metrics.avgTenureBeforePromo)}</p>
          <p className="text-xs text-muted-foreground">Avg Tenure to Promo</p>
        </div>
        <div className="p-4 border border-border rounded-xl text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
          <p className="text-2xl font-bold text-foreground">{metrics.stagnantRoles}</p>
          <p className="text-xs text-muted-foreground">Stagnant Roles (3yr+)</p>
        </div>
      </div>

      {metrics.departmentBreakdown.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">Promotions by Department</h3>
          <div className="space-y-2">
            {metrics.departmentBreakdown.map(d => (
              <div key={d.department} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <span className="text-foreground">{d.department}</span>
                <span className="font-bold text-foreground">{d.promos}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
