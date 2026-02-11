import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DisputeResolvedPayload {
  type: "UPDATE";
  record: {
    id: string;
    user_id: string;
    employment_record_id: string;
    reason: string;
    status: string;
    admin_notes: string | null;
    resolved_at: string | null;
  };
  old_record: {
    status: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate that the caller is authorized (database trigger with service role key)
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    console.error("Unauthorized access attempt to notify-dispute-resolved");
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid service key" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: DisputeResolvedPayload = await req.json();
    const { record, old_record } = payload;

    // Only send email if status changed to resolved or rejected
    const wasResolved = 
      (old_record.status === "open" || old_record.status === "under_review") &&
      (record.status === "resolved" || record.status === "rejected");

    if (!wasResolved) {
      return new Response(JSON.stringify({ message: "No notification needed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", record.user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch employment record and employer details
    const { data: employmentRecord, error: empError } = await supabase
      .from("employment_records")
      .select("job_title, employer_id")
      .eq("id", record.employment_record_id)
      .single();

    if (empError || !employmentRecord) {
      console.error("Error fetching employment record:", empError);
      return new Response(
        JSON.stringify({ error: "Employment record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: employer } = await supabase
      .from("employers")
      .select("company_name")
      .eq("id", employmentRecord.employer_id)
      .single();

    const companyName = employer?.company_name || "Unknown Company";
    const isResolved = record.status === "resolved";

    const subject = isResolved 
      ? `Dispute Resolved - ${companyName}` 
      : `Dispute Update - ${companyName}`;

    const statusColor = isResolved ? "#22c55e" : "#ef4444";
    const statusText = isResolved ? "Resolved" : "Rejected";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Dispute ${statusText}</h1>
        <p>Hello ${profile.first_name},</p>
        <p>Your dispute regarding the employment record at <strong>${companyName}</strong> has been reviewed by our admin team.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Position:</strong> ${employmentRecord.job_title}</p>
          <p><strong>Your Reason:</strong> ${record.reason}</p>
          <p style="margin-top: 15px;">
            <strong>Status:</strong> 
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
              ${statusText}
            </span>
          </p>
          ${record.admin_notes ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
              <p><strong>Admin Notes:</strong></p>
              <p style="color: #555;">${record.admin_notes}</p>
            </div>
          ` : ""}
        </div>
        
        <p>${isResolved 
          ? "The employment record has been updated based on your dispute." 
          : "After review, the admin team determined the original record is accurate."
        }</p>
        
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The WorkID Team</p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "WorkID <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    // Success - email sent

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-dispute-resolved function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
