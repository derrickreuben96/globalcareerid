import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEmployerProjects, useDeleteProject, useUpdateProjectStatus, useSealProject, ProjectStatus } from "@/hooks/useProjects";
import { Briefcase, Loader2, Plus, Trash2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_employee_confirmation: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  active: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  sealed: "bg-verified/10 text-verified",
  disputed: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  pending_employee_confirmation: "Pending Employee",
  active: "Active",
  sealed: "Sealed",
  disputed: "Disputed",
};

export default function EmployerProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [loadingEmployer, setLoadingEmployer] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("employers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setEmployerId(data?.id ?? null);
      setLoadingEmployer(false);
    })();
  }, [user]);

  const { data: projects = [], isLoading } = useEmployerProjects(employerId);
  const deleteProject = useDeleteProject();
  const updateStatus = useUpdateProjectStatus();
  const sealProject = useSealProject();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold">Verified Projects</h1>
            <p className="text-sm text-muted-foreground">
              Add and manage measurable project achievements for your employees.
            </p>
          </div>
          <Button onClick={() => navigate("/employer/projects/add")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Project
          </Button>
        </div>

        {(loadingEmployer || isLoading) ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !employerId ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
            No employer record found.
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No projects yet.</p>
            <Button onClick={() => navigate("/employer/projects/add")} className="gap-2">
              <Plus className="w-4 h-4" /> Add your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <Badge className={STATUS_STYLES[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(p.start_date).toLocaleDateString()} —{" "}
                    {p.end_date ? new Date(p.end_date).toLocaleDateString() : "Present"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={async () => {
                          await updateStatus.mutateAsync({ id: p.id, status: "pending_employee_confirmation" });
                          toast.success("Sent to employee for confirmation");
                        }}
                      >
                        <Send className="w-4 h-4" /> Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Delete this draft?")) return;
                          await deleteProject.mutateAsync(p.id);
                          toast.success("Deleted");
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {p.status === "active" && (
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={sealProject.isPending}
                      onClick={async () => {
                        try {
                          await sealProject.mutateAsync(p.id);
                          toast.success("Project sealed cryptographically");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to seal");
                        }
                      }}
                    >
                      <ShieldCheck className="w-4 h-4" /> Seal
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
