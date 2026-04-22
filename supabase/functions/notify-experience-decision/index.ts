import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the caller is an admin
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!
  ).auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller is admin or employer
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  const { data: isEmployer } = await supabase.rpc("has_role", { _user_id: user.id, _role: "employer" });

  if (!isAdmin && !isEmployer) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { request_id, decision, admin_notes } = await req.json();

    // Fetch the request with related data
    const { data: request, error: reqError } = await supabase
      .from("experience_update_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch employee profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", request.user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch employer name
    const { data: employer } = await supabase
      .from("employers")
      .select("company_name")
      .eq("id", request.employer_id)
      .single();

    const companyName = employer?.company_name || "your employer";
    const changes = typeof request.requested_changes === "object"
      ? request.requested_changes
      : {};
    const reason = changes.reason || "";

    const changesList = Object.entries(changes)
      .filter(([k]) => k !== "reason")
      .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
      .join("");

    const isApproved = decision === "approved";
    const subject = isApproved
      ? `Experience Update Approved - ${companyName}`
      : `Experience Update Request Declined - ${companyName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Experience Update ${isApproved ? "Approved" : "Declined"}</h1>
        <p>Hello ${profile.first_name},</p>
        <p>Your experience update request for <strong>${companyName}</strong> has been <strong>${isApproved ? "approved" : "declined"}</strong>.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Requested Changes:</strong></p>
          <ul>${changesList}</ul>
          ${reason ? `<p><strong>Your Reason:</strong> ${reason}</p>` : ""}
        </div>
        ${admin_notes ? `<div style="background: ${isApproved ? "#e8f5e9" : "#fce4ec"}; padding: 16px; border-radius: 8px; margin: 20px 0;"><p><strong>Admin Notes:</strong> ${admin_notes}</p></div>` : ""}
        ${isApproved
          ? "<p>The changes have been applied to your employment record.</p>"
          : "<p>If you believe this is incorrect, you can submit a new request with additional details or contact your employer directly.</p>"
        }
        <p>Best regards,<br>The WorkID Team</p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "WorkID <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in notify-experience-decision:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
