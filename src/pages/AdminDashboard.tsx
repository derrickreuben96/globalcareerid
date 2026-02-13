import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminEmployerVerification } from "@/components/admin/AdminEmployerVerification";
import { AdminDisputeResolution } from "@/components/admin/AdminDisputeResolution";
import { AdminAIChat } from "@/components/admin/AdminAIChat";
import { AdminActivityLog } from "@/components/admin/AdminActivityLog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Employer {
  id: string;
  company_name: string;
  registration_number: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
  employment_record_id: string;
  user: {
    first_name: string;
    last_name: string;
    profile_id: string;
  } | null;
  employment_record: {
    job_title: string;
    employer: { company_name: string } | null;
  } | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, roles, isLoading: authLoading, signOut } = useAuth();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const activeSection = searchParams.get("section") || "overview";

  // Admin verification
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      toast.error("Please sign in to access this page.");
      return;
    }
    if (!roles.includes("admin")) {
      navigate("/");
      toast.error("Access denied. Admin privileges required.");
      return;
    }
  }, [user, roles, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user || !roles.includes("admin")) return;
    setIsLoading(true);

    const [employersRes, disputesRes, profileCountRes] = await Promise.all([
      supabase.from("employers").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_admin_disputes"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    setEmployers((employersRes.data as Employer[]) || []);
    setUserCount(profileCountRes.count || 0);

    // Enrich disputes with user and employment data
    const disputesData = disputesRes.data || [];
    if (disputesData.length > 0) {
      const userIds = disputesData.map((d) => d.user_id);
      const recordIds = disputesData.map((d) => d.employment_record_id);

      const [profilesRes, recordsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name, profile_id")
          .in("user_id", userIds),
        supabase
          .from("employment_records")
          .select("id, job_title, employer_id")
          .in("id", recordIds),
      ]);

      const employerIds = recordsRes.data?.map((r) => r.employer_id) || [];
      const { data: empData } = employerIds.length
        ? await supabase.from("employers").select("id, company_name").in("id", employerIds)
        : { data: [] };

      const enriched: Dispute[] = disputesData.map((d) => {
        const record = recordsRes.data?.find((r) => r.id === d.employment_record_id);
        return {
          ...d,
          user: profilesRes.data?.find((p) => p.user_id === d.user_id) || null,
          employment_record: record
            ? {
                job_title: record.job_title,
                employer: empData?.find((e) => e.id === record.employer_id) || null,
              }
            : null,
        };
      });
      setDisputes(enriched);
    } else {
      setDisputes([]);
    }

    setIsLoading(false);
  }, [user, roles]);

  useEffect(() => {
    if (user && roles.includes("admin")) {
      fetchData();
    }
  }, [user, roles, fetchData]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !roles.includes("admin")) {
    return null; // Will redirect via useEffect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = employers.filter((e) => e.verification_status === "pending").length;
  const openDisputeCount = disputes.filter(
    (d) => d.status === "open" || d.status === "under_review"
  ).length;

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <AdminOverview
            employers={employers}
            disputes={disputes}
            userCount={userCount}
          />
        );
      case "users":
        return <AdminUserManagement />;
      case "employers":
        return (
          <AdminEmployerVerification
            employers={employers}
            onRefresh={fetchData}
          />
        );
      case "disputes":
        return (
          <AdminDisputeResolution disputes={disputes} onRefresh={fetchData} />
        );
      case "ai-chat":
        return (
          <AdminAIChat
            context={{
              total_employers: employers.length,
              pending_verifications: pendingCount,
              open_disputes: openDisputeCount,
              total_users: userCount,
            }}
          />
        );
      case "activity":
        return <AdminActivityLog />;
      default:
        return <AdminOverview employers={employers} disputes={disputes} userCount={userCount} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          pendingCount={pendingCount}
          disputeCount={openDisputeCount}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 overflow-auto">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-sm font-display font-semibold text-foreground capitalize">
              {activeSection.replace("-", " ")}
            </h1>
          </header>
          <div className="p-6 max-w-7xl mx-auto">{renderSection()}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
