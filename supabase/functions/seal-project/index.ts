import { SignJWT, importPKCS8 } from "npm:jose@^6.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "").trim();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load project + verify ownership and pre-conditions
    const { data: project, error: projectError } = await adminClient
      .from("projects")
      .select("id, title, description, measurable_outcome, profile_id, employer_id, user_id, employee_confirmed_at, status, start_date, end_date")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.status === "sealed") {
      return new Response(JSON.stringify({ error: "Project is already sealed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!project.employee_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "Employee has not confirmed this project yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Confirm caller is the verified employer who created this project
    const { data: employer, error: employerError } = await adminClient
      .from("employers")
      .select("id, is_verified, user_id")
      .eq("id", project.employer_id)
      .eq("user_id", user.id)
      .eq("is_verified", true)
      .single();

    if (employerError || !employer) {
      return new Response(
        JSON.stringify({ error: "Forbidden - you are not the verified owner of this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gather skills
    const { data: skillsRows } = await adminClient
      .from("project_skills")
      .select("skill")
      .eq("project_id", projectId);
    const skills = (skillsRows ?? []).map((r: { skill: string }) => r.skill);

    // Sign JWT
    const privateKeyPem = Deno.env.get("CREDENTIAL_PRIVATE_KEY");
    if (!privateKeyPem) {
      return new Response(JSON.stringify({ error: "Signing key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const privateKey = await importPKCS8(privateKeyPem, "ES256");
    const now = Math.floor(Date.now() / 1000);
    const tenYears = 10 * 365 * 24 * 60 * 60;
    const sealedAtIso = new Date().toISOString();

    const jwt = await new SignJWT({
      kind: "verified_project",
      projectId: project.id,
      employerId: project.employer_id,
      profileId: project.profile_id,
      title: project.title,
      outcome: project.measurable_outcome ?? "",
      skills,
      startDate: project.start_date,
      endDate: project.end_date,
      sealedAt: sealedAtIso,
      issuedBy: user.id,
    })
      .setProtectedHeader({ alg: "ES256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + tenYears)
      .setIssuer("globalcareerid")
      .setSubject(project.profile_id)
      .sign(privateKey);

    // Update project: signed_jwt + status=sealed + employer_sealed_at via service role
    const { error: updateError } = await adminClient
      .from("projects")
      .update({
        signed_jwt: jwt,
        status: "sealed",
        employer_sealed_at: sealedAtIso,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to seal project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("project_audit_log").insert({
      project_id: projectId,
      action: "employer_sealed",
      performed_by: user.id,
      metadata: { sealedAt: sealedAtIso },
    });

    return new Response(JSON.stringify({ jwt, sealedAt: sealedAtIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("seal-project error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
