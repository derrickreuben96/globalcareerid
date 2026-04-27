import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProjectStatus =
  | "draft"
  | "pending_employee_confirmation"
  | "active"
  | "sealed"
  | "disputed";

export interface ProjectRow {
  id: string;
  title: string;
  description: string;
  raw_notes: string | null;
  scope: string | null;
  budget_range: string | null;
  measurable_outcome: string | null;
  start_date: string;
  end_date: string | null;
  status: ProjectStatus;
  employer_id: string;
  user_id: string;
  profile_id: string;
  added_by: string;
  signed_jwt: string | null;
  employee_confirmed_at: string | null;
  employer_sealed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmployerProjects(employerId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", "employer", employerId],
    enabled: !!employerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("*")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ProjectRow[]) ?? [];
    },
  });
}

export function useEmployeeProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", "employee", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["active", "sealed", "disputed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ProjectRow[]) ?? [];
    },
  });
}

export function usePendingProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", "pending", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "pending_employee_confirmation")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ProjectRow[]) ?? [];
    },
  });
}

export function useProjectById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const [projectRes, skillsRes] = await Promise.all([
        supabase.from("projects" as never).select("*").eq("id", id).single(),
        supabase.from("project_skills" as never).select("*").eq("project_id", id),
      ]);
      if (projectRes.error) throw projectRes.error;
      return {
        project: projectRes.data as unknown as ProjectRow,
        skills: ((skillsRes.data as unknown) as Array<{ id: string; skill: string; ai_extracted: boolean }>) ?? [],
      };
    },
  });
}

interface AddProjectInput {
  title: string;
  description: string;
  raw_notes?: string;
  scope?: string;
  budget_range?: string | null;
  measurable_outcome?: string;
  start_date: string;
  end_date?: string | null;
  status: "draft" | "pending_employee_confirmation";
  employer_id: string;
  user_id: string;
  profile_id: string;
  skills: string[];
}

export function useAddProject() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddProjectInput) => {
      if (!user) throw new Error("Not authenticated");
      const { skills, ...projectData } = input;
      const { data: project, error } = await supabase
        .from("projects" as never)
        .insert({ ...projectData, added_by: user.id })
        .select("*")
        .single();
      if (error) throw error;
      const proj = project as unknown as ProjectRow;
      if (skills.length > 0) {
        const { error: skillsError } = await supabase
          .from("project_skills" as never)
          .insert(skills.map((s) => ({ project_id: proj.id, skill: s, ai_extracted: false })));
        if (skillsError) throw skillsError;
      }
      return proj;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase
        .from("projects" as never)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useConfirmProject() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects" as never)
        .update({ status: "active", employee_confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (user) {
        await supabase.from("project_audit_log" as never).insert({
          project_id: id,
          action: "employee_confirmed",
          performed_by: user.id,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDisputeProject() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error: insErr } = await supabase
        .from("project_dispute_log" as never)
        .insert({ project_id: id, raised_by: user.id, reason });
      if (insErr) throw insErr;
      const { error: updErr } = await supabase
        .from("projects" as never)
        .update({ status: "disputed" })
        .eq("id", id);
      if (updErr) throw updErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useSealProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke("seal-project", {
        body: { projectId },
      });
      if (error) throw error;
      return data as { jwt: string; sealedAt: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
