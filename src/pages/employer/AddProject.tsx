import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAddProject } from "@/hooks/useProjects";
import { useExpandProject, useExtractSkills, useGuidedQuestions } from "@/hooks/useAIProjectAssistant";
import { Sparkles, Loader2, X, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface EmployeeOption {
  user_id: string;
  profile_id: string;
  profile_uuid: string;
  full_name: string;
  job_title: string;
}

export default function AddProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [employerName, setEmployerName] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // Step 2 state
  const [rawNotes, setRawNotes] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [outcome, setOutcome] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);

  // Step 3
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const expand = useExpandProject();
  const extract = useExtractSkills();
  const guided = useGuidedQuestions();
  const addProject = useAddProject();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: emp } = await supabase
        .from("employers")
        .select("id, company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) return;
      setEmployerId(emp.id);
      setEmployerName(emp.company_name);

      const { data: rows } = await supabase.rpc("get_employer_employee_details", {
        employer_id_param: emp.id,
      });
      const list = (rows ?? []).map((r: { user_id: string; profile_id: string; first_name: string; last_name: string; job_title: string }) => ({
        user_id: r.user_id,
        profile_id: r.profile_id,
        profile_uuid: "",
        full_name: `${r.first_name} ${r.last_name}`,
        job_title: r.job_title,
      }));
      // Resolve profile uuid
      if (list.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, user_id")
          .in("user_id", list.map((l: EmployeeOption) => l.user_id));
        const map = new Map((profs ?? []).map((p) => [p.user_id, p.id]));
        list.forEach((l: EmployeeOption) => { l.profile_uuid = map.get(l.user_id) ?? ""; });
      }
      setEmployees(list.filter((l: EmployeeOption) => l.profile_uuid));
    })();
  }, [user]);

  const canNext = useMemo(() => {
    if (step === 1) return !!selectedEmployee;
    if (step === 2) return title.trim() && description.trim() && startDate;
    return true;
  }, [step, selectedEmployee, title, description, startDate]);

  const runExpand = async () => {
    if (!rawNotes.trim() || !selectedEmployee) return;
    try {
      const r = await expand.mutateAsync({
        rawNotes,
        employerName,
        employeeName: selectedEmployee.full_name,
      });
      setTitle(r.title);
      setDescription(r.description);
      setScope(r.scope);
      setOutcome(r.measurable_outcome);
      // Fire and forget
      if (r.title && r.description) {
        guided.mutateAsync({ title: r.title, description: r.description }).then(setQuestions).catch(() => {});
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    }
  };

  const runExtractSkills = async () => {
    if (!title || !description) return;
    try {
      const r = await extract.mutateAsync({ title, description });
      setSkills(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    }
  };

  const submit = async (status: "draft" | "pending_employee_confirmation") => {
    if (!employerId || !selectedEmployee) return;
    try {
      await addProject.mutateAsync({
        title,
        description,
        raw_notes: rawNotes,
        scope,
        budget_range: budget || null,
        measurable_outcome: outcome,
        start_date: startDate,
        end_date: endDate || null,
        status,
        employer_id: employerId,
        user_id: selectedEmployee.user_id,
        profile_id: selectedEmployee.profile_uuid,
        skills,
      });
      toast.success(status === "draft" ? "Saved as draft" : "Sent for employee confirmation");
      navigate("/employer/projects");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate("/employer/projects")}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-display font-semibold mb-2">Add Verified Project</h1>
        <div className="flex gap-2 mb-6 text-sm text-muted-foreground">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`px-2 py-1 rounded ${step === n ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              Step {n}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <Label>Select Employee</Label>
            <Select
              value={selectedEmployee?.user_id ?? ""}
              onValueChange={(v) => {
                const e = employees.find((x) => x.user_id === v) ?? null;
                setSelectedEmployee(e);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Choose an employee..." /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.user_id} value={e.user_id}>
                    {e.full_name} — {e.job_title} ({e.profile_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground">No verified employees found.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-6 space-y-3">
              <Label>Describe the project in your own words</Label>
              <Textarea
                rows={8}
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="e.g. Sarah led our warehouse management system migration. Took 4 months, team of 6, went live on time and under budget."
              />
              <Button onClick={runExpand} disabled={!rawNotes.trim() || expand.isPending} className="gap-2 w-full">
                {expand.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Expand with AI
              </Button>
            </div>
            <div className="glass-card rounded-2xl p-6 space-y-3">
              {expand.isPending ? (
                <p className="text-sm text-muted-foreground">AI is structuring your entry...</p>
              ) : (
                <>
                  <div><Label>Project Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                  <div><Label>Scope</Label><Input value={scope} onChange={(e) => setScope(e.target.value)} /></div>
                  <div><Label>Measurable Outcome</Label><Input value={outcome} onChange={(e) => setOutcome(e.target.value)} /></div>
                  <div><Label>Budget Range (optional)</Label><Input value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Start</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div><Label>End</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                  </div>
                  {questions.length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium mb-2">Strengthen this entry by addressing:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {questions.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Skills</Label>
              <Button variant="outline" size="sm" onClick={runExtractSkills} disabled={extract.isPending} className="gap-2">
                {extract.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Extract with AI
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => setSkills(skills.filter((x) => x !== s))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && skillInput.trim()) {
                    e.preventDefault();
                    if (!skills.includes(skillInput.trim())) setSkills([...skills, skillInput.trim()]);
                    setSkillInput("");
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">These skills will be added to the employee's verified skill profile.</p>
          </div>
        )}

        {step === 4 && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground">{employerName} • {selectedEmployee?.full_name}</p>
            <p>{description}</p>
            {scope && <p className="text-sm"><strong>Scope:</strong> {scope}</p>}
            {outcome && <div className="p-3 bg-verified/5 border border-verified/20 rounded"><strong>Outcome:</strong> {outcome}</div>}
            <p className="text-sm text-muted-foreground">{startDate} — {endDate || "Present"}</p>
            <div className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => submit("draft")} disabled={addProject.isPending}>Save as Draft</Button>
              <Button onClick={() => submit("pending_employee_confirmation")} disabled={addProject.isPending}>
                Send for Employee Confirmation
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {step < 4 && (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)} className="gap-1">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
