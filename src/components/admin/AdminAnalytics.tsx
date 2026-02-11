import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { TrendingUp, Users, Building2, AlertTriangle } from 'lucide-react';

interface Employer {
  id: string;
  company_name: string;
  is_verified: boolean;
  verification_status: string;
  industry: string | null;
  created_at: string;
}

interface Dispute {
  id: string;
  status: string;
  created_at: string;
}

interface AdminAnalyticsProps {
  employers: Employer[];
  disputes: Dispute[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export function AdminAnalytics({ employers, disputes }: AdminAnalyticsProps) {
  // Process data for charts
  const registrationTrend = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const employerCount = employers.filter(e => 
        e.created_at.split('T')[0] === dateStr
      ).length;
      
      const disputeCount = disputes.filter(d => 
        d.created_at.split('T')[0] === dateStr
      ).length;
      
      last7Days.push({
        day: dayLabel,
        employers: employerCount,
        disputes: disputeCount
      });
    }
    return last7Days;
  }, [employers, disputes]);

  const verificationStats = useMemo(() => {
    const pending = employers.filter(e => e.verification_status === 'pending').length;
    const approved = employers.filter(e => e.verification_status === 'approved').length;
    const rejected = employers.filter(e => e.verification_status === 'rejected').length;
    
    return [
      { name: 'Pending', value: pending, color: 'hsl(var(--warning))' },
      { name: 'Approved', value: approved, color: 'hsl(var(--verified))' },
      { name: 'Rejected', value: rejected, color: 'hsl(var(--destructive))' }
    ].filter(item => item.value > 0);
  }, [employers]);

  const disputeStats = useMemo(() => {
    const open = disputes.filter(d => d.status === 'open').length;
    const underReview = disputes.filter(d => d.status === 'under_review').length;
    const resolved = disputes.filter(d => d.status === 'resolved').length;
    const rejected = disputes.filter(d => d.status === 'rejected').length;
    
    return [
      { name: 'Open', value: open, color: 'hsl(var(--warning))' },
      { name: 'Under Review', value: underReview, color: 'hsl(var(--accent))' },
      { name: 'Resolved', value: resolved, color: 'hsl(var(--verified))' },
      { name: 'Rejected', value: rejected, color: 'hsl(var(--destructive))' }
    ].filter(item => item.value > 0);
  }, [disputes]);

  const industryDistribution = useMemo(() => {
    const industries: Record<string, number> = {};
    employers.forEach(e => {
      const industry = e.industry || 'Unspecified';
      industries[industry] = (industries[industry] || 0) + 1;
    });
    
    return Object.entries(industries)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [employers]);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{employers.length}</p>
              <p className="text-xs text-muted-foreground">Total Employers</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-verified/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-verified" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {employers.filter(e => e.is_verified).length}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {employers.filter(e => e.verification_status === 'pending').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{disputes.length}</p>
              <p className="text-xs text-muted-foreground">Total Disputes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Trend */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">7-Day Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrationTrend}>
                <defs>
                  <linearGradient id="colorEmployers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDisputes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="employers" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorEmployers)" 
                  name="Employers"
                />
                <Area 
                  type="monotone" 
                  dataKey="disputes" 
                  stroke="hsl(var(--destructive))" 
                  fillOpacity={1} 
                  fill="url(#colorDisputes)" 
                  name="Disputes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Status Pie */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Verification Status</h3>
          <div className="h-64">
            {verificationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {verificationStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No employer data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Industry Distribution */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Industries</h3>
          <div className="h-64">
            {industryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    className="text-xs fill-muted-foreground" 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    name="Employers"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No industry data yet
              </div>
            )}
          </div>
        </div>

        {/* Dispute Status */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dispute Status</h3>
          <div className="h-64">
            {disputeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disputeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {disputeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No dispute data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
