import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Shield, Users, Building2, AlertTriangle, RefreshCw } from 'lucide-react';

interface PlatformStats {
  totalUsers: number;
  totalEmployers: number;
  pendingDisputes: number;
  pendingVerifications: number;
}

export function AdminSettings() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalEmployers: 0,
    pendingDisputes: 0,
    pendingVerifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch counts using admin-accessible queries
      const [profilesRes, employersRes, disputesRes, verificationsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('employers').select('id', { count: 'exact', head: true }),
        supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('employers').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        totalEmployers: employersRes.count || 0,
        pendingDisputes: disputesRes.count || 0,
        pendingVerifications: verificationsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
    toast.success('Statistics refreshed');
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Administrator Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Platform management and oversight tools
          </p>
        </div>
        <Badge variant="default" className="bg-primary">Admin</Badge>
      </div>

      {/* Platform Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium">Platform Statistics</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-muted/50 rounded-xl animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs">Employers</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalEmployers}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-warning mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Open Disputes</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pendingDisputes}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Pending Verifications</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pendingVerifications}</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Quick Actions */}
      <div className="border-t border-border pt-6 space-y-4">
        <Label className="text-foreground font-medium">Quick Actions</Label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/admin">
              <Shield className="w-4 h-4 mr-2" />
              Admin Dashboard
            </a>
          </Button>
        </div>
      </div>

      {/* Admin Session Info */}
      <div className="border-t border-border pt-6">
        <div className="p-4 bg-primary/10 rounded-xl">
          <p className="text-sm text-primary font-medium mb-1">Admin Session Active</p>
          <p className="text-xs text-muted-foreground">
            You have full platform management access. All actions are logged for security.
          </p>
        </div>
      </div>
    </div>
  );
}
