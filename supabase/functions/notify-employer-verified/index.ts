import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { employer_id, approved, rejection_notes } = await req.json();

    if (!employer_id) {
      return new Response(
        JSON.stringify({ error: "employer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isApproved = approved !== false; // default to true for backward compat

    // Fetch employer details
    const { data: employer, error: empError } = await supabase
      .from("employers")
      .select("company_name, user_id, employer_id, industry, country")
      .eq("id", employer_id)
      .single();

    if (empError || !employer) {
      console.error("Error fetching employer:", empError);
      return new Response(
        JSON.stringify({ error: "Employer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile to get email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", employer.user_id)
      .single();

    // Fallback: get email from auth.users if no profile exists
    let email = profile?.email;
    let firstName = profile?.first_name || "";

    if (!email) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(employer.user_id);
      if (authError || !authUser?.user?.email) {
        console.error("Error fetching auth user:", authError);
        return new Response(
          JSON.stringify({ error: "User email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      email = authUser.user.email;
      firstName = authUser.user.user_metadata?.first_name || "there";
    }

    let subject: string;
    let htmlContent: string;

    if (isApproved) {
      // Also fetch organization_profiles for the organization_id
      const { data: orgProfile } = await supabase
        .from("organization_profiles")
        .select("organization_id")
        .eq("user_id", employer.user_id)
        .single();

      const orgId = orgProfile?.organization_id || employer.employer_id || "N/A";

      subject = `✅ ${employer.company_name} — Organization Verified Successfully`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #0f172a; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your organization has been verified</p>
          </div>
          <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1a1a1a; font-size: 16px;">Hello ${firstName},</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              We are pleased to inform you that <strong>${employer.company_name}</strong> has been successfully verified on TrueWork ID. 
              You now have full access to employer features including adding employment records for your employees.
            </p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #166534;">Your Organization Details</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 140px;">Organization ID:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 600; font-family: monospace;">${orgId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Company Name:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${employer.company_name}</td>
                </tr>
                ${employer.industry ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Industry:</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px;">${employer.industry}</td></tr>` : ""}
                ${employer.country ? `<tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Country:</td><td style="padding: 6px 0; color: #0f172a; font-size: 13px;">${employer.country}</td></tr>` : ""}
              </table>
            </div>

            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Please keep your Organization ID safe — you may need it for reference. You can now log in to your employer dashboard to start managing employment records.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated message from TrueWork ID. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;
    } else {
      // Rejection email
      subject = `❌ ${employer.company_name} — Organization Verification Unsuccessful`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #7f1d1d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verification Update</h1>
            <p style="color: #fca5a5; margin: 8px 0 0 0; font-size: 14px;">Your organization verification was not approved</p>
          </div>
          <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1a1a1a; font-size: 16px;">Hello ${firstName},</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              We regret to inform you that the verification request for <strong>${employer.company_name}</strong> on TrueWork ID has not been approved at this time.
            </p>

            ${rejection_notes ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">Reason for Rejection</p>
              <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.6;">${rejection_notes}</p>
            </div>
            ` : ""}

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">What You Can Do</p>
              <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.8;">
                <li>Review the rejection reason above and address the issues</li>
                <li>Ensure your company registration details are accurate and up to date</li>
                <li>Update your company profile with correct information</li>
                <li>Contact our support team if you believe this was an error</li>
              </ul>
            </div>

            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              You may update your organization profile and resubmit for verification. If you have questions, please reach out to our support team.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated message from TrueWork ID. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "TrueWork ID <onboarding@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-employer-verified:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
