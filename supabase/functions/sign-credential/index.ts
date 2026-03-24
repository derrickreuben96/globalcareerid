import { SignJWT, importPKCS8 } from "npm:jose@^6.0.0";

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

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profileId, employerId, role, startDate, endDate } =
      await req.json();

    if (!profileId || !employerId || !role || !startDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Authorization checks using service role ---
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Verify the caller owns this employer and that the employer is verified
    const { data: employer, error: employerError } = await adminClient
      .from("employers")
      .select("id")
      .eq("id", employerId)
      .eq("user_id", user.id)
      .eq("is_verified", true)
      .single();

    if (employerError || !employer) {
      return new Response(
        JSON.stringify({ error: "Forbidden - you are not the owner of this verified employer" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Resolve the target user from profileId and verify an employment record exists
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Forbidden - profile not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: empRecord, error: empRecordError } = await adminClient
      .from("employment_records")
      .select("id")
      .eq("employer_id", employerId)
      .eq("user_id", profile.user_id)
      .in("status", ["active", "ended"])
      .single();

    if (empRecordError || !empRecord) {
      return new Response(
        JSON.stringify({ error: "Forbidden - no employment relationship found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Sign the credential ---
    const privateKeyPem = Deno.env.get("CREDENTIAL_PRIVATE_KEY");
    if (!privateKeyPem) {
      return new Response(
        JSON.stringify({ error: "Signing key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const privateKey = await importPKCS8(privateKeyPem, "ES256");

    const now = Math.floor(Date.now() / 1000);
    const tenYears = 10 * 365 * 24 * 60 * 60;

    const jwt = await new SignJWT({
      profileId,
      employerId,
      role,
      startDate,
      ...(endDate && { endDate }),
      issuedBy: user.id,
    })
      .setProtectedHeader({ alg: "ES256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + tenYears)
      .setIssuer("globalcareerid")
      .setSubject(profileId)
      .sign(privateKey);

    // Store in credentials table
    const { error: insertError } = await adminClient
      .from("credentials")
      .insert({
        profile_id: profileId,
        employer_id: employerId,
        signed_jwt: jwt,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store credential" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ jwt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sign credential error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
