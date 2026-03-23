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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body for the export request ID
    let exportRequestId: string | null = null;
    try {
      const body = await req.json();
      exportRequestId = body.exportRequestId;
    } catch {
      // No body provided
    }

    // Update status to processing
    if (exportRequestId) {
      await adminClient
        .from("data_export_requests")
        .update({ status: "processing" })
        .eq("id", exportRequestId)
        .eq("user_id", userId);
    }

    // Gather ALL user data from every table
    const [
      profileRes,
      workHistoryRes,
      employmentRecordsRes,
      credentialsRes,
      verificationRequestsRes,
      disputesRes,
      consentLogRes,
      notificationPrefsRes,
      referralLettersRes,
      roleHistoryRes,
    ] = await Promise.all([
      adminClient.from("profiles").select("*").eq("user_id", userId),
      adminClient.from("work_history").select("*").eq("user_id", userId),
      adminClient.from("employment_records").select("*").eq("user_id", userId),
      adminClient.from("credentials").select("id, profile_id, employer_id, issued_at, revoked_at").eq("profile_id",
        // Get profile id first
        (await adminClient.from("profiles").select("id").eq("user_id", userId).maybeSingle()).data?.id
      ),
      adminClient.from("verification_requests").select("id, work_history_id, employer_email, status, created_at, expires_at").in(
        "work_history_id",
        (await adminClient.from("work_history").select("id").eq("user_id", userId)).data?.map((w: any) => w.id) || []
      ),
      adminClient.from("disputes").select("*").eq("user_id", userId),
      adminClient.from("consent_log").select("*").eq("user_id", userId),
      adminClient.from("notification_preferences").select("*").eq("user_id", userId),
      adminClient.from("referral_letters").select("*").eq("employee_user_id", userId),
      adminClient.from("role_history").select("*").in(
        "employment_record_id",
        (await adminClient.from("employment_records").select("id").eq("user_id", userId)).data?.map((e: any) => e.id) || []
      ),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: profileRes.data,
      workHistory: workHistoryRes.data,
      employmentRecords: employmentRecordsRes.data,
      credentials: credentialsRes.data,
      verificationRequests: verificationRequestsRes.data,
      disputes: disputesRes.data,
      consentLog: consentLogRes.data,
      notificationPreferences: notificationPrefsRes.data,
      referralLetters: referralLettersRes.data,
      roleHistory: roleHistoryRes.data,
    };

    // Upload to storage
    const timestamp = Date.now();
    const filePath = `exports/${userId}/data-${timestamp}.json`;
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const { error: uploadError } = await adminClient.storage
      .from("user-exports")
      .upload(filePath, jsonBlob, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload export" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create signed URL (48hr expiry)
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("user-exports")
      .createSignedUrl(filePath, 48 * 60 * 60);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to create download link" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Update export request
    if (exportRequestId) {
      await adminClient
        .from("data_export_requests")
        .update({
          status: "ready",
          download_url: signedUrlData.signedUrl,
          expires_at: expiresAt,
        })
        .eq("id", exportRequestId)
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrlData.signedUrl,
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Export error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
