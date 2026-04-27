import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Calendar, Building2, Target, Sparkles, AlertTriangle } from "lucide-react";

interface ProjectView {
  id: string;
  title: string;
  description: string;
  scope: string | null;
  budget_range: string | null;
  measurable_outcome: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  signed_jwt: string | null;
  employer_sealed_at: string | null;
  user_id: string;
  employer_id: string;
}

export default function PublicProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [employer, setEmployer] = useState<{ company_name: string; is_verified: boolean } | null>(null);
  const [employee, setEmployee] = useState<{ first_name: string; last_name: string; profile_id: string } | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projectId) return;
      try {
        const { data: proj, error: pErr } = await (supabase as any)
          .from("projects" as never)
          .select("*")
          .eq("id", projectId)
          .in("status", ["sealed"])
          .maybeSingle();

        if (pErr) throw pErr;
        if (!proj) {
          if (!cancelled) setError("This project is not publicly available.");
          return;
        }
        const p = proj as unknown as ProjectView;

        // Employee profile must be public
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("first_name,last_name,profile_id,visibility")
          .eq("user_id", p.user_id)
          .maybeSingle();

        if (!profile || (profile as any).visibility !== "public") {
          if (!cancelled) setError("This project's owner has not made their profile public.");
          return;
        }

        const { data: emp } = await (supabase as any)
          .rpc("get_public_employer_info", { employer_id_param: p.employer_id })
          .maybeSingle();

        const { data: skillRows } = await (supabase as any)
          .from("project_skills" as never)
          .select("skill")
          .eq("project_id", p.id);

        if (!cancelled) {
          setProject(p);
          setEmployee({
            first_name: (profile as any).first_name,
            last_name: (profile as any).last_name,
            profile_id: (profile as any).profile_id,
          });
          if (emp) setEmployer({ company_name: (emp as any).company_name, is_verified: (emp as any).is_verified });
          setSkills(((skillRows as any) ?? []).map((r: any) => r.skill));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !project ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h1 className="text-xl font-display font-semibold mb-2">Project unavailable</h1>
            <p className="text-sm text-muted-foreground">{error ?? "Not found."}</p>
          </div>
        ) : (
          <article className="glass-card rounded-2xl p-8 space-y-6">
            <header className="space-y-3">
              <Badge className="bg-verified/10 text-verified gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Cryptographically sealed
              </Badge>
              <h1 className="text-3xl font-display font-semibold">{project.title}</h1>
              {employee && (
                <p className="text-muted-foreground">
                  Delivered by{" "}
                  <Link to={`/verify/${employee.profile_id}`} className="text-primary hover:underline">
                    {employee.first_name} {employee.last_name}
                  </Link>
                </p>
              )}
            </header>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {employer && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{employer.company_name}</span>
                  {employer.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-verified" />}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {new Date(project.start_date).toLocaleDateString()} –{" "}
                  {project.end_date ? new Date(project.end_date).toLocaleDateString() : "Present"}
                </span>
              </div>
            </div>

            <section>
              <h2 className="font-medium mb-2">Description</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
            </section>

            {project.scope && (
              <section>
                <h2 className="font-medium mb-2">Scope</h2>
                <p className="text-sm leading-relaxed">{project.scope}</p>
              </section>
            )}

            {project.measurable_outcome && (
              <section>
                <h2 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Outcome
                </h2>
                <p className="text-sm leading-relaxed">{project.measurable_outcome}</p>
              </section>
            )}

            {skills.length > 0 && (
              <section>
                <h2 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {project.employer_sealed_at && (
              <footer className="pt-4 border-t text-xs text-muted-foreground">
                Sealed on {new Date(project.employer_sealed_at).toLocaleString()} · This record is signed
                with ES256 and verifiable cryptographically.
              </footer>
            )}

            <div>
              <Button asChild variant="outline" size="sm">
                <Link to="/verify-credential">Verify signature</Link>
              </Button>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
