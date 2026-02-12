import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data } = await req.json();

    // Use Lovable AI via the LOVABLE_API_KEY
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let prompt = "";

    switch (action) {
      case "employer_risk_assessment": {
        const employer = data.employer;
        prompt = `You are an employer verification analyst for a career verification platform called Global Career ID. Analyze this employer application and provide a brief risk assessment.

Employer Details:
- Company Name: ${employer.company_name}
- Industry: ${employer.industry || "Not provided"}
- Country: ${employer.country || "Not provided"}
- Registration Number: ${employer.registration_number || "Not provided"}
- Website: ${employer.website || "Not provided"}
- Phone: ${employer.phone || "Not provided"}
- Address: ${employer.address || "Not provided"}

Provide a concise risk assessment with:
1. Risk Level (Low/Medium/High)
2. Key observations (2-3 bullet points)
3. Recommended action (Approve/Request more info/Reject)
4. Any red flags to investigate

Keep the response under 200 words. Be professional and objective.`;
        break;
      }

      case "dispute_summary": {
        const dispute = data.dispute;
        prompt = `You are a dispute resolution advisor for a career verification platform called Global Career ID. Summarize this dispute and suggest a resolution.

Dispute Details:
- Filed by: ${dispute.user_name}
- Regarding: ${dispute.job_title} at ${dispute.company_name}
- Reason: "${dispute.reason}"
- Status: ${dispute.status}
- Filed on: ${dispute.created_at}

Provide:
1. Brief summary of the dispute
2. Key considerations for resolution
3. Recommended resolution (Resolve in user's favor / Reject / Need more info)
4. Suggested admin notes template

Keep the response under 200 words. Be fair and professional.`;
        break;
      }

      case "user_activity_summary": {
        const userData = data.user_data;
        prompt = `You are an admin assistant for a career verification platform called Global Career ID. Provide a brief activity summary for this user.

User: ${userData.first_name} ${userData.last_name}
Profile ID: ${userData.profile_id}
Account Type: ${userData.account_type}
Created: ${userData.created_at}
Employment Records: ${userData.employment_count || 0}
Disputes Filed: ${userData.dispute_count || 0}
Visibility: ${userData.visibility}

Provide a brief 2-3 sentence summary of the user's activity and any notable patterns.`;
        break;
      }

      case "admin_chat": {
        const question = data.question;
        const context = data.context || {};
        prompt = `You are an AI admin assistant for Global Career ID, a career verification platform. Help the admin with their question.

Platform context:
- Total employers: ${context.total_employers || "unknown"}
- Pending verifications: ${context.pending_verifications || "unknown"}
- Open disputes: ${context.open_disputes || "unknown"}
- Total users: ${context.total_users || "unknown"}

Admin question: "${question}"

Provide a helpful, concise response. If the question is about platform operations, give actionable advice. Keep response under 150 words.`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Call Lovable AI
    const aiResponse = await fetch(
      "https://api.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await aiResponse.json();
    const content =
      aiResult.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
