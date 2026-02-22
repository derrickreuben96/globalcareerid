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

    const { employer_id } = await req.json();

    if (!employer_id) {
      return new Response(
        JSON.stringify({ error: "employer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", employer.user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also fetch organization_profiles for the organization_id
    const { data: orgProfile } = await supabase
      .from("organization_profiles")
      .select("organization_id")
      .eq("user_id", employer.user_id)
      .single();

    const orgId = orgProfile?.organization_id || employer.employer_id || "N/A";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your organization has been verified</p>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1a1a1a; font-size: 16px;">Hello ${profile.first_name},</p>
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

          <div style="text-align: center; margin: 28px 0;">
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}" 
               style="background: #0f172a; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
              Go to Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated message from TrueWork ID. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "TrueWork ID <onboarding@resend.dev>",
      to: [profile.email],
      subject: `✅ ${employer.company_name} — Organization Verified Successfully`,
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
