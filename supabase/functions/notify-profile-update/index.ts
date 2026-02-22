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
    const { email, first_name, update_type, details } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = first_name || "there";

    let subject: string;
    let detailsHtml: string;

    switch (update_type) {
      case "profile_completed":
        subject = "✅ Your Global Career ID Profile is Complete";
        detailsHtml = `
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Great news! Your profile has been successfully set up and is ready for employers to discover.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #166534;">Your profile is now active and can be shared with potential employers using your Profile ID.</p>
          </div>
        `;
        break;
      case "skills_updated":
        subject = "🔄 Your Skills Have Been Updated";
        detailsHtml = `
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your skills on Global Career ID have been updated successfully.
          </p>
          ${details ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">Updated Skills</p>
            <p style="margin: 0; color: #334155; font-size: 13px;">${details}</p>
          </div>` : ""}
        `;
        break;
      case "visibility_changed":
        subject = "🔒 Profile Visibility Updated";
        detailsHtml = `
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your profile visibility settings have been changed${details ? ` to <strong>${details}</strong>` : ""}.
          </p>
        `;
        break;
      case "profile_updated":
      default:
        subject = "🔄 Your Profile Has Been Updated";
        detailsHtml = `
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Your Global Career ID profile has been updated successfully.${details ? ` Changes: ${details}` : ""}
          </p>
        `;
        break;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Profile Update</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Global Career ID</p>
        </div>
        <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1a1a1a; font-size: 16px;">Hello ${name},</p>
          ${detailsHtml}
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            If you did not make this change, please secure your account immediately by changing your password.
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

    console.log("Profile update email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-profile-update:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
