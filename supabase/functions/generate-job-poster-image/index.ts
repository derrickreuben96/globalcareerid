import "../_shared/cors.ts";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface Body {
  job_title: string;
  role_category?: string;
  location?: string;
  description?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isEmployer } = await adminClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "employer",
    });
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isEmployer && !isAdmin) return json({ error: "Forbidden" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const { job_title, role_category, location, description } = body;
    if (!job_title) return json({ error: "Missing job_title" }, 400);

    const prompt = `Professional editorial photograph for a recruitment poster illustrating the job role: "${job_title}"${
      role_category ? ` (category: ${role_category})` : ""
    }. Show a single realistic worker actively performing this exact job in a believable real-world workplace${
      location ? ` in ${location}` : ""
    } — for example a driver seated at the wheel of a car, a delivery rider handing over a parcel, a nurse in a ward, a welder at a workbench. Wide landscape composition with clear negative space on the left side for text overlay. Natural daylight, sharp focus, realistic photography, no text, no letters, no logos, no watermarks, no collage.${
      description ? ` Context: ${description.slice(0, 400)}` : ""
    }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("image gateway error", resp.status, t);
      if (resp.status === 429) return json({ error: "Rate limit exceeded, try again shortly." }, 429);
      if (resp.status === 402) {
        return json({ error: "AI credits exhausted. Add credits in Workspace settings." }, 402);
      }
      return json({ error: "Image generation failed" }, 500);
    }

    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("no image in response", JSON.stringify(data).slice(0, 500));
      return json({ error: "Image generation returned no image" }, 500);
    }

    return json({ image_data_url: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error("generate-job-poster-image error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
