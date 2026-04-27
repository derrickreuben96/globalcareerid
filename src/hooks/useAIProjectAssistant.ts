import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExpandInput {
  rawNotes: string;
  employerName: string;
  employeeName: string;
  projectId?: string;
}
interface ExpandResult {
  title: string;
  description: string;
  scope: string;
  measurable_outcome: string;
}

async function callAssistant<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-project-assistant", {
    body: { action, ...body },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { result: T }).result;
}

export function useExpandProject() {
  return useMutation({
    mutationFn: (input: ExpandInput) =>
      callAssistant<ExpandResult>("expand", { ...input }),
  });
}

export function useExtractSkills() {
  return useMutation({
    mutationFn: (input: { title: string; description: string; projectId?: string }) =>
      callAssistant<string[]>("extract_skills", input),
  });
}

export function useGuidedQuestions() {
  return useMutation({
    mutationFn: (input: { title: string; description: string; projectId?: string }) =>
      callAssistant<string[]>("guided_questions", input),
  });
}
