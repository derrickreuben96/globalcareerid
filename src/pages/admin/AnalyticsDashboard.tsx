import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, Award, CheckCircle, Building2, Loader2, ShieldAlert } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
  'hsl(142, 76%, 36%)',
  'hsl(0, 84%, 60%)',
];

interface KPI {
  totalProfiles: number;
  credentialsThisMonth: number;
  verificationsThisMonth: number;
  activeEmployers: number;
}

interface DailySignup {
  date: string;
  count: number;
}

interface VerificationBreakdown {
  status: string;
  count: number;
}

export default function AnalyticsDashboard() {
  const { user, roles, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes('admin');

  const [kpis, setKpis] = useState<KPI>({
    totalProfiles: 0,
    credentialsThisMonth: 0,
    verificationsThisMonth: 0,
    activeEmployers: 0,
  });
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [verificationBreakdown, setVerificationBreakdown] = useState<VerificationBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchData = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        profilesRes,
        credentialsRes,
        verificationsRes,
        employersRes,
        signupsRes,
        verStatusRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('credentials' as any)
          .select('id', { count: 'exact', head: true })
          .gte('issued_at', startOfMonth),
        supabase
          .from('work_history')
          .select('id', { count: 'exact', head: true })
          .gte('verification_requested_at', startOfMonth),
        supabase
          .from('employers')
          .select('id', { count: 'exact', head: true })
          .eq('is_verified', true),
        // Daily signups: profiles created in last 30 days
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: true }),
        // Verification status breakdown
        supabase
          .from('work_history')
          .select('verification_status'),
      ]);

      setKpis({
        totalProfiles: profilesRes.count || 0,
        credentialsThisMonth: credentialsRes.count || 0,
        verificationsThisMonth: verificationsRes.count || 0,
        activeEmployers: employersRes.count || 0,
      });

      // Aggregate daily signups
      const signupMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        signupMap[d.toISOString().split('T')[0]] = 0;
      }
      signupsRes.data?.forEach((row: any) => {
        const day = row.created_at.split('T')[0];
        if (signupMap[day] !== undefined) signupMap[day]++;
      });
      setDailySignups(
        Object.entries(signupMap).map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
        }))
      );

      // Aggregate verification breakdown
      const statusMap: Record<string, number> = {};
      verStatusRes.data?.forEach((row: any) => {
        const s = row.verification_status || 'unknown';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      setVerificationBreakdown(
        Object.entries(statusMap).map(([status, count]) => ({ status, count }))
      );

      setLoading(false);
    };

    fetchData();
  }, [user, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="flex flex-col items-center py-8 gap-3">
            <ShieldAlert className="w-10 h-10 text-destructive" />
            <p className="text-muted-foreground text-center">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Profiles', value: kpis.totalProfiles, icon: Users, color: 'text-primary' },
    { label: 'Credentials (This Month)', value: kpis.credentialsThisMonth, icon: Award, color: 'text-accent-foreground' },
    { label: 'Verifications (This Month)', value: kpis.verificationsThisMonth, icon: CheckCircle, color: 'text-primary' },
    { label: 'Active Employers', value: kpis.activeEmployers, icon: Building2, color: 'text-accent-foreground' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground">Real-time metrics and insights</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpiCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className={`p-2.5 rounded-lg bg-muted ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="signups" className="space-y-6">
            <TabsList>
              <TabsTrigger value="signups">Daily Signups</TabsTrigger>
              <TabsTrigger value="verifications">Verification Status</TabsTrigger>
            </TabsList>

            <TabsContent value="signups">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Signups (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailySignups}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          interval={4}
                          className="text-muted-foreground"
                        />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.15)"
                          strokeWidth={2}
                          name="Signups"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verifications">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Verification Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={verificationBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                            {verificationBreakdown.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={verificationBreakdown}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ status, percent }) =>
                              `${status} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {verificationBreakdown.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
