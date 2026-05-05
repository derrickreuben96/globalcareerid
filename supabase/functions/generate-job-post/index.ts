import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  company_name: string;
  job_title: string;
  description: string;
  role_category?: string;
  location?: string;
  apply_url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const { company_name, job_title, description, role_category, location, apply_url } = body;

    if (!company_name || !job_title || !description || !apply_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a professional recruitment copywriter. Generate a clean, shareable job post using ONLY the data provided. Do NOT invent salary, benefits, company history, requirements, or any details not explicitly given. If a field is missing, simply omit that section. Use this STRICT template with markdown:

🚀 We're Hiring: {Job Title}
🏢 Company: {Company Name}
${location ? "📍 Location: {Location}\n" : ""}${role_category ? "🗂️ Category: {Category}\n" : ""}
**About the Role**
{A clean 2-3 sentence summary derived strictly from the provided description. No invented facts.}

**Key Responsibilities**
- {bullet from description}
- {bullet from description}
- {bullet from description}

**How to Apply**
Apply via your Global Career ID:
👉 {apply_url}

#Hiring #GlobalCareerID

Rules:
- Do NOT add requirements, benefits, salary, or culture details unless present in the input.
- Keep bullets concise (max 12 words).
- Output plain markdown only, no preamble or explanation.`;

    const userPrompt = `Company Name: ${company_name}
Job Title: ${job_title}
${role_category ? `Category: ${role_category}\n` : ""}${location ? `Location: ${location}\n` : ""}Apply URL: ${apply_url}

Job Description:
${description}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ job_post_text: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-job-post error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
