import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "expand" | "extract_skills" | "guided_questions";

const SYSTEM_PROMPTS: Record<Action, string> = {
  expand:
    "You are a professional HR achievement writer. Transform the employer's rough notes into a structured, specific, measurable project entry for a verified employment credential. Return only valid JSON with these fields: title, description, scope, measurable_outcome. Be specific and professional. Do not invent numbers not implied by the notes.",
  extract_skills:
    "Extract a list of professional skills demonstrated in this project description. Return only a JSON array of strings. Maximum 8 skills. Be specific (e.g. 'ERP Implementation' not just 'Software'). Example: [\"Project Management\", \"Stakeholder Communication\", \"Budget Control\"]",
  guided_questions:
    "Based on this project, generate 3 specific follow-up questions an employer should answer to make this achievement more credible and measurable. Return only a JSON array of question strings.",
};

function extractJson(text: string): unknown {
  const trimmed = (text || "").trim();
  // Strip ``` fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to grab first { ... } or [ ... ]
    const objMatch = candidate.match(/\{[\s\S]*\}/);
    const arrMatch = candidate.match(/\[[\s\S]*\]/);
    const fallback = objMatch?.[0] ?? arrMatch?.[0];
    if (fallback) {
      try {
        return JSON.parse(fallback);
      } catch { /* ignore */ }
    }
    return null;
  }
}

serve(async (req) => {
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const action = body.action as Action | undefined;
    const projectId: string | undefined = typeof body.projectId === "string" ? body.projectId : undefined;

    if (!action || !(action in SYSTEM_PROMPTS)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-action input validation + user prompt construction
    let userPrompt = "";
    if (action === "expand") {
      const rawNotes = String(body.rawNotes || "").trim();
      const employerName = String(body.employerName || "").trim().slice(0, 200);
      const employeeName = String(body.employeeName || "").trim().slice(0, 200);
      if (!rawNotes || rawNotes.length > 4000) {
        return new Response(JSON.stringify({ error: "rawNotes must be 1-4000 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt =
        `Employer: ${employerName}\nEmployee: ${employeeName}\nRaw notes:\n${rawNotes}`;
    } else if (action === "extract_skills") {
      const title = String(body.title || "").trim().slice(0, 300);
      const description = String(body.description || "").trim().slice(0, 4000);
      if (!description) {
        return new Response(JSON.stringify({ error: "description is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt = `Title: ${title}\nDescription:\n${description}`;
    } else {
      const title = String(body.title || "").trim().slice(0, 300);
      const description = String(body.description || "").trim().slice(0, 4000);
      if (!title || !description) {
        return new Response(JSON.stringify({ error: "title and description are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt = `Title: ${title}\nDescription:\n${description}`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing");
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[action] },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    let result: unknown;
    if (action === "expand") {
      // Expect object with title/description/scope/measurable_outcome
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        result = {
          title: String(obj.title ?? ""),
          description: String(obj.description ?? ""),
          scope: String(obj.scope ?? ""),
          measurable_outcome: String(obj.measurable_outcome ?? ""),
        };
      } else {
        result = { title: "", description: content, scope: "", measurable_outcome: "" };
      }
    } else {
      // Expect array of strings (skills or questions)
      const arr = Array.isArray(parsed) ? parsed : [];
      result = arr.map((s) => String(s)).filter(Boolean).slice(0, action === "extract_skills" ? 8 : 3);
    }

    // Best-effort audit log if projectId is provided
    if (projectId) {
      try {
        const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await adminClient.from("project_audit_log").insert({
          project_id: projectId,
          action: action === "expand" ? "ai_expanded" : action === "extract_skills" ? "skill_extracted" : "ai_questions_generated",
          performed_by: userId,
          metadata: { action },
        });
      } catch (logErr) {
        console.error("Audit log error:", logErr);
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-project-assistant error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
