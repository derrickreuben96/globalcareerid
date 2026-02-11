import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helpers
const validateString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
};

const sanitizeString = (value: unknown, maxLength: number, defaultValue = ""): string => {
  if (typeof value !== "string") return defaultValue;
  return value.trim().substring(0, maxLength);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { step, data } = body as { step: unknown; data: unknown };

    // Validate step parameter
    if (!step || typeof step !== "string" || step.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid step parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate data parameter
    if (data !== undefined && data !== null && typeof data !== "object") {
      return new Response(JSON.stringify({ error: "Invalid data parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeData = (data || {}) as Record<string, unknown>;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (step) {
      case "welcome": {
        const firstName = sanitizeString(safeData.firstName, 100, "there");
        systemPrompt = `You are a friendly Global Career ID onboarding assistant. Generate a brief, personalized welcome message for a new user. Be warm and professional. Keep it under 50 words. Focus on the value of verified employment records.`;
        userPrompt = `Welcome a new user named "${firstName}" to Global Career ID.`;
        break;
      }

      case "career_goals": {
        const experienceLevel = sanitizeString(safeData.experienceLevel, 50, "entry");
        const interests = sanitizeString(safeData.interests, 500, "general professional development");
        systemPrompt = `You are a career advisor. Based on the user's experience level and interests, suggest 3 specific career focus areas or goals. Return as JSON array with objects containing "goal" and "description" fields.`;
        userPrompt = `User experience: ${experienceLevel}. Interests: ${interests}. Suggest personalized career goals.`;
        break;
      }

      case "skill_recommendations": {
        const jobTitle = sanitizeString(safeData.jobTitle, 100, "");
        const interests = sanitizeString(safeData.interests, 500, "");
        const experienceLevel = sanitizeString(safeData.experienceLevel, 50, "entry");
        const topic = jobTitle || interests || "professional";
        systemPrompt = `You are a career skills expert. Based on the user's job title or career interests, suggest 5-8 relevant professional skills they should add to their profile. Return as a JSON array of skill strings.`;
        userPrompt = `Job title or interest: "${topic}". Experience level: ${experienceLevel}. Suggest relevant skills.`;
        break;
      }

      case "profile_tips": {
        const experienceLevel = sanitizeString(safeData.experienceLevel, 50, "entry");
        const industry = sanitizeString(safeData.industry, 100, "general");
        systemPrompt = `You are a profile optimization expert. Provide 3 specific, actionable tips for making a strong Global Career ID profile. Return as JSON array with objects containing "tip" and "explanation" fields.`;
        userPrompt = `Provide profile optimization tips for someone with ${experienceLevel} level experience in ${industry} field.`;
        break;
      }

      case "bio_suggestion": {
        const firstName = sanitizeString(safeData.firstName, 100, "a professional");
        const experienceLevel = sanitizeString(safeData.experienceLevel, 50, "entry");
        const jobTitle = sanitizeString(safeData.jobTitle, 100, "");
        const jobPart = jobTitle ? `, working as a ${jobTitle}` : "";
        systemPrompt = `You are a professional bio writer. Generate a professional bio for a Global Career ID profile. Keep it under 150 characters. Be concise but impactful.`;
        userPrompt = `Write a professional bio for ${firstName} who is ${experienceLevel} level${jobPart}.`;
        break;
      }

      case "position_assist": {
        // Validate required prompt field
        const prompt = validateString(safeData.prompt, 800);
        if (!prompt) {
          return new Response(JSON.stringify({ error: "Missing or invalid prompt (max 800 chars)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const companyName = sanitizeString(safeData.companyName, 120, "(unknown)");
        const industry = sanitizeString(safeData.industry, 120, "(unknown)");

        systemPrompt = `You help an employer fill employment record fields.

Return ONLY valid JSON with this exact shape:
{
  "jobTitle": string,
  "department": string | null,
  "employmentType": "full_time" | "part_time" | "contract" | "internship"
}

Rules:
- Keep jobTitle concise (max 60 chars).
- department should be null if unknown.
- Choose employmentType based on the prompt; default to "full_time" if unclear.
`;

        userPrompt = `Company: ${companyName}
Industry: ${industry}
Role description: ${prompt}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown step" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});