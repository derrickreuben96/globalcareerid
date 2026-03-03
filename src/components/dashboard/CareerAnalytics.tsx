import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Clock, Building2, Award } from 'lucide-react';

interface CareerAnalyticsProps {
  userId: string;
}

interface AnalyticsData {
  totalTenureMonths: number;
  promotionCount: number;
  avgRoleDurationMonths: number;
  timeToFirstPromotionMonths: number | null;
  companiesWorked: number;
}

export function CareerAnalytics({ userId }: CareerAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: records } = await supabase
        .from('employment_records')
        .select('id, start_date, end_date, employer_id')
        .eq('user_id', userId)
        .in('status', ['active', 'ended']);

      const { data: roles } = await supabase
        .from('role_history')
        .select('*')
        .in('employment_record_id', (records || []).map(r => r.id))
        .order('role_start_date', { ascending: true });

      if (!records?.length) {
        setData(null);
        setLoading(false);
        return;
      }

      // Total tenure
      const now = new Date();
      let totalMonths = 0;
      records.forEach(r => {
        const start = new Date(r.start_date);
        const end = r.end_date ? new Date(r.end_date) : now;
        totalMonths += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      });

      // Promotions
      const promotions = (roles || []).filter(r => r.promotion_type === 'promotion');
      const promotionCount = promotions.length;

      // Avg role duration
      const allRoles = roles || [];
      let totalRoleDuration = 0;
      allRoles.forEach(r => {
        const start = new Date(r.role_start_date);
        const end = r.role_end_date ? new Date(r.role_end_date) : now;
        totalRoleDuration += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      });
      const avgRoleDuration = allRoles.length ? totalRoleDuration / allRoles.length : 0;

      // Time to first promotion
      let timeToFirst: number | null = null;
      if (promotions.length > 0) {
        // Find earliest employment start and first promotion
        const earliestStart = new Date(Math.min(...records.map(r => new Date(r.start_date).getTime())));
        const firstPromo = new Date(promotions[0].role_start_date);
        timeToFirst = (firstPromo.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
      }

      // Unique companies
      const uniqueEmployers = new Set(records.map(r => r.employer_id));

      setData({
        totalTenureMonths: Math.round(totalMonths),
        promotionCount,
        avgRoleDurationMonths: Math.round(avgRoleDuration),
        timeToFirstPromotionMonths: timeToFirst !== null ? Math.round(timeToFirst) : null,
        companiesWorked: uniqueEmployers.size,
      });
      setLoading(false);
    };

    fetch();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="text-muted-foreground text-center py-6">No data available for analytics.</p>;

  const formatDuration = (months: number) => {
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} yr ${rem} mo` : `${years} yr`;
  };

  const stats = [
    { icon: Clock, label: 'Total Tenure', value: formatDuration(data.totalTenureMonths) },
    { icon: Award, label: 'Promotions', value: data.promotionCount.toString() },
    { icon: TrendingUp, label: 'Avg Role Duration', value: formatDuration(data.avgRoleDurationMonths) },
    { icon: Building2, label: 'Companies', value: data.companiesWorked.toString() },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Career Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-4 border border-border rounded-xl text-center">
            <s.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      {data.timeToFirstPromotionMonths !== null && (
        <p className="text-sm text-muted-foreground">
          Time to first promotion: <span className="font-medium text-foreground">{formatDuration(data.timeToFirstPromotionMonths)}</span>
        </p>
      )}
    </div>
  );
}
