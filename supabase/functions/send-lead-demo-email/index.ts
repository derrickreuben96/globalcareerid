import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  ).auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  try {
    const body = await req.json();
    const leadId = String(body?.lead_id ?? "");
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const followUpAt: string | null = body?.follow_up_at ?? null;

    if (!leadId || !subject || !message) {
      return json({ error: "lead_id, subject and message are required" }, 400);
    }
    if (subject.length > 200 || message.length > 8000) {
      return json({ error: "Subject or message is too long" }, 400);
    }

    const { data: lead, error: leadError } = await admin
      .from("employer_leads")
      .select("id, company_name, contact_name, work_email")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) return json({ error: "Lead not found" }, 404);

    const paragraphs = message
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="font-size:20px;color:#0f172a;margin:0 0 20px;">Global Career ID</h1>
        ${paragraphs}
        <div style="margin:28px 0;">
          <a href="https://globalcareerid.com/for-employers/demo"
             style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
            Book your demo
          </a>
        </div>
        <p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;">
          You are receiving this because ${escapeHtml(lead.company_name)} requested information from Global Career ID.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Global Career ID <onboarding@resend.dev>",
      to: [lead.work_email],
      subject,
      html,
    });

    if ((emailResponse as { error?: { message?: string } })?.error) {
      const details = (emailResponse as { error?: { message?: string } }).error?.message;
      console.error("Resend error:", details);
      return json({ error: "Email provider rejected the send", details }, 502);
    }

    await admin.from("lead_activities").insert({
      lead_id: leadId,
      activity_type: "email",
      subject,
      body: message,
      follow_up_at: followUpAt,
      created_by: user.id,
    });

    await admin
      .from("employer_leads")
      .update({
        last_contacted_at: new Date().toISOString(),
        next_follow_up_at: followUpAt,
        status: "contacted",
      })
      .eq("id", leadId)
      .eq("status", "new");

    await admin
      .from("employer_leads")
      .update({
        last_contacted_at: new Date().toISOString(),
        ...(followUpAt ? { next_follow_up_at: followUpAt } : {}),
      })
      .eq("id", leadId);

    return json({ success: true });
  } catch (error) {
    console.error("send-lead-demo-email failed:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
