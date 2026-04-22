import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmploymentChangePayload {
  type: "INSERT" | "UPDATE";
  record: {
    id: string;
    user_id: string;
    employer_id: string;
    job_title: string;
    department: string | null;
    start_date: string;
    end_date: string | null;
    status: string;
    employment_type: string;
  };
  old_record?: {
    status: string;
    end_date: string | null;
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
    console.error("Unauthorized access attempt to notify-employment-change");
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid service key" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EmploymentChangePayload = await req.json();
    const { type, record, old_record } = payload;

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

    // Check notification preferences
    const { data: notifPrefs } = await supabase
      .from("notification_preferences")
      .select("email_on_record_added, email_on_record_ended, email_on_record_updated")
      .eq("user_id", record.user_id)
      .maybeSingle();

    // Default to true if no preferences exist
    const prefs = notifPrefs || {
      email_on_record_added: true,
      email_on_record_ended: true,
      email_on_record_updated: true,
    };

    // Fetch employer details
    const { data: employer, error: employerError } = await supabase
      .from("employers")
      .select("company_name")
      .eq("id", record.employer_id)
      .single();

    if (employerError || !employer) {
      console.error("Error fetching employer:", employerError);
      return new Response(
        JSON.stringify({ error: "Employer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject: string;
    let htmlContent: string;

    if (type === "INSERT") {
      // Check if user wants notifications for new records
      if (!prefs.email_on_record_added) {
        // User disabled notifications - skip silently
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      subject = `New Employment Record Added - ${employer.company_name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">New Employment Record</h1>
          <p>Hello ${profile.first_name},</p>
          <p><strong>${employer.company_name}</strong> has added a new employment record to your WorkID profile:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Position:</strong> ${record.job_title}</p>
            ${record.department ? `<p><strong>Department:</strong> ${record.department}</p>` : ""}
            <p><strong>Employment Type:</strong> ${record.employment_type.replace("_", " ")}</p>
            <p><strong>Start Date:</strong> ${new Date(record.start_date).toLocaleDateString()}</p>
            ${record.end_date ? `<p><strong>End Date:</strong> ${new Date(record.end_date).toLocaleDateString()}</p>` : "<p><strong>Status:</strong> Currently Active</p>"}
          </div>
          <p>If this information is incorrect, you can dispute this record from your WorkID dashboard.</p>
          <p>Best regards,<br>The WorkID Team</p>
        </div>
      `;
    } else {
      // UPDATE
      const wasEnded = !old_record?.end_date && record.end_date;

      if (wasEnded) {
        // Check if user wants notifications for ended records
        if (!prefs.email_on_record_ended) {
          // User disabled notifications - skip silently
          return new Response(JSON.stringify({ success: true, skipped: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        subject = `Employment Ended - ${employer.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Employment Record Updated</h1>
            <p>Hello ${profile.first_name},</p>
            <p>Your employment record at <strong>${employer.company_name}</strong> has been marked as ended:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Position:</strong> ${record.job_title}</p>
              <p><strong>Start Date:</strong> ${new Date(record.start_date).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(record.end_date!).toLocaleDateString()}</p>
            </div>
            <p>If this information is incorrect, you can dispute this record from your WorkID dashboard.</p>
            <p>Best regards,<br>The WorkID Team</p>
          </div>
        `;
      } else {
        // Check if user wants notifications for updated records
        if (!prefs.email_on_record_updated) {
          // User disabled notifications - skip silently
          return new Response(JSON.stringify({ success: true, skipped: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        subject = `Employment Record Updated - ${employer.company_name}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Employment Record Updated</h1>
            <p>Hello ${profile.first_name},</p>
            <p>Your employment record at <strong>${employer.company_name}</strong> has been updated:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Position:</strong> ${record.job_title}</p>
              ${record.department ? `<p><strong>Department:</strong> ${record.department}</p>` : ""}
              <p><strong>Employment Type:</strong> ${record.employment_type.replace("_", " ")}</p>
              <p><strong>Start Date:</strong> ${new Date(record.start_date).toLocaleDateString()}</p>
              ${record.end_date ? `<p><strong>End Date:</strong> ${new Date(record.end_date).toLocaleDateString()}</p>` : "<p><strong>Status:</strong> Currently Active</p>"}
            </div>
            <p>If this information is incorrect, you can dispute this record from your WorkID dashboard.</p>
            <p>Best regards,<br>The WorkID Team</p>
          </div>
        `;
      }
    }

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
  } catch (error) {
    console.error("Error in notify-employment-change function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
