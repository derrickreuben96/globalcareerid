import { AdminAnalytics } from "./AdminAnalytics";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, AlertTriangle, Shield, TrendingUp } from "lucide-react";

interface Props {
  employers: any[];
  disputes: any[];
  userCount: number;
}

export function AdminOverview({ employers, disputes, userCount }: Props) {
  const pendingEmployers = employers.filter(
    (e) => e.verification_status === "pending"
  ).length;
  const verifiedEmployers = employers.filter((e) => e.is_verified).length;
  const openDisputes = disputes.filter(
    (d) => d.status === "open" || d.status === "under_review"
  ).length;
  const resolvedDisputes = disputes.filter(
    (d) => d.status === "resolved"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">
          Platform Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time platform metrics and analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{userCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {employers.length}
              </p>
              <p className="text-xs text-muted-foreground">Employers</p>
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
                {verifiedEmployers}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingEmployers}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
          {pendingEmployers > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 text-[10px]"
            >
              !
            </Badge>
          )}
        </div>
        <div className="glass-card rounded-xl p-4 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {openDisputes}
              </p>
              <p className="text-xs text-muted-foreground">Open Disputes</p>
            </div>
          </div>
          {openDisputes > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 text-[10px]"
            >
              {openDisputes}
            </Badge>
          )}
        </div>
      </div>

      {/* Charts */}
      <AdminAnalytics employers={employers} disputes={disputes} />
    </div>
  );
}
