import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateStringField(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength).trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
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

    const userId = claimsData.claims.sub;

    // Verify caller is an employer
    const { data: employer } = await supabase
      .from("employers")
      .select("id, is_verified")
      .eq("user_id", userId)
      .single();

    if (!employer) {
      return new Response(JSON.stringify({ error: "Only employers can generate referral letters" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input validation ---
    const body = await req.json();
    const employeeName = validateStringField(body.employeeName, 200);
    const jobTitle = validateStringField(body.jobTitle, 200);
    const department = validateStringField(body.department, 200);
    const companyName = validateStringField(body.companyName, 200);
    const startDate = validateStringField(body.startDate, 50);
    const endDate = validateStringField(body.endDate, 50);
    const additionalNotes = validateStringField(body.additionalNotes, 1000);
    const writerName = validateStringField(body.writerName, 200);
    const writerDesignation = validateStringField(body.writerDesignation, 200);
    const writerContact = validateStringField(body.writerContact, 100);
    const writerAddress = validateStringField(body.writerAddress, 500);

    if (!employeeName || !jobTitle || !companyName || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Write a professional referral/recommendation letter for an employee with the following details:

- Employee Name: ${employeeName}
- Job Title: ${jobTitle}
- Department: ${department || 'Not specified'}
- Company: ${companyName}
- Employment Period: ${startDate} to ${endDate}
${additionalNotes ? `- Additional Notes from Employer: ${additionalNotes}` : ''}

The letter is being written by:
- Name: ${writerName || 'Not specified'}
- Designation: ${writerDesignation || 'Not specified'}
${writerContact ? `- Contact: ${writerContact}` : ''}
${writerAddress ? `- Address: ${writerAddress}` : ''}

Write a formal, professional referral letter. The letter should:
1. Be addressed "To Whom It May Concern"
2. Include the current date at the top
3. Confirm the employment details
4. Highlight positive professional qualities
5. Recommend the employee for future opportunities
6. Do NOT include a signature block at the end — it will be added separately
7. Be concise but thorough (about 250-350 words)

Do NOT use placeholder brackets like [Name] — use the actual details provided.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional HR letter writer. Write clear, formal referral letters." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const letter = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ letter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-referral-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
