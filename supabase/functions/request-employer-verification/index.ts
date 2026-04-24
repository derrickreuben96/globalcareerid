import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { work_history_id, employer_email } = await req.json();

    if (!work_history_id || !employer_email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: record } = await supabase
      .from("work_history")
      .select("*")
      .eq("id", work_history_id)
      .eq("user_id", user.id)
      .single();

    if (!record) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Hash the token before storing — only the hash is persisted.
    // The raw token is sent in the email link and never written to the database.
    const tokenHashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const tokenHash = Array.from(new Uint8Array(tokenHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: insertError } = await supabase
      .from("verification_requests")
      .insert({
        work_history_id,
        employer_email,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("work_history")
      .update({
        verification_status: "pending_employer",
        verification_requested_at: new Date().toISOString(),
      })
      .eq("id", work_history_id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const verifyUrl = `${supabaseUrl}/functions/v1/verify-employment?token=${encodeURIComponent(token)}`;
      
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "TrueWork <noreply@resend.dev>",
          to: [employer_email],
          subject: `Employment Verification Request - ${escapeHtml(profile?.first_name)} ${escapeHtml(profile?.last_name)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Employment Verification Request</h2>
              <p>${escapeHtml(profile?.first_name)} ${escapeHtml(profile?.last_name)} has requested verification of their employment at <strong>${escapeHtml(record.company_name)}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Role</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(record.role)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Period</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(record.start_date)} to ${escapeHtml(record.end_date) || 'Present'}</td></tr>
              </table>
              <p>Please click the link below to confirm or deny this employment record:</p>
              <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Review Verification</a>
              <p style="color: #666; font-size: 12px;">This link expires in 7 days. No account is required.</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
