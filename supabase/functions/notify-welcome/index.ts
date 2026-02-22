import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

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
    const { email, first_name, account_type } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = first_name || "there";
    const isOrg = account_type === "organization";

    const subject = isOrg
      ? "🏢 Welcome to TrueWork ID — Organization Registration Received"
      : "🎉 Welcome to Global Career ID!";

    const htmlContent = isOrg
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to TrueWork ID</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Organization Registration Received</p>
          </div>
          <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1a1a1a; font-size: 16px;">Hello ${name},</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Thank you for registering your organization on TrueWork ID. Your application has been received and is now under review by our verification team.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">⏳ What Happens Next?</p>
              <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.8;">
                <li>Our team will review your organization details</li>
                <li>Verification typically takes 24-48 hours</li>
                <li>You'll receive an email once your organization is verified</li>
                <li>Once verified, you can start adding employment records for your employees</li>
              </ul>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated message from TrueWork ID. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Welcome to Global Career ID!</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your verified professional identity starts here</p>
          </div>
          <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1a1a1a; font-size: 16px;">Hello ${name},</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Welcome aboard! Your Global Career ID account has been created successfully. You now have a unique verified professional identity that employers can trust.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #166534;">✅ Getting Started</p>
              <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.8;">
                <li>Complete your profile with skills and experience level</li>
                <li>Share your Profile ID with employers for instant verification</li>
                <li>Your employment records will be added by verified employers</li>
                <li>Control who sees your profile with privacy settings</li>
              </ul>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Say goodbye to fake CVs — your work history will be verified by employers, not written by you. Welcome to the future of hiring.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated message from TrueWork ID. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "TrueWork ID <onboarding@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-welcome:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
