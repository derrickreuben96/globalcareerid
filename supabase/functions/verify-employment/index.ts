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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  if (!token) {
    return new Response(renderPage("Invalid Link", "This verification link is invalid.", "error"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  const { data: request, error } = await supabase
    .from("verification_requests")
    .select("*, work_history:work_history!inner(*)")
    .eq("token", token)
    .single();

  if (error || !request) {
    return new Response(renderPage("Invalid Link", "This verification link is invalid or has already been used.", "error"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  if (new Date(request.expires_at) < new Date()) {
    await supabase.from("verification_requests").update({ status: "expired" }).eq("id", request.id);
    return new Response(renderPage("Link Expired", "This verification link has expired. Please ask the employee to send a new request.", "error"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  if (request.status !== "pending") {
    return new Response(renderPage("Already Processed", "This verification request has already been processed.", "info"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  const wh = request.work_history;

  if (!action) {
    return new Response(renderReviewPage(wh, token), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  if (action === "confirm") {
    await supabase.from("verification_requests").update({ status: "completed" }).eq("id", request.id);
    await supabase.from("work_history").update({
      verification_status: "employer_verified",
      verification_method: "employer_email",
      verified_at: new Date().toISOString(),
    }).eq("id", wh.id);

    return new Response(renderPage("Employment Verified ✓", 
      `You have confirmed that <strong>${escapeHtml(wh.role)}</strong> at <strong>${escapeHtml(wh.company_name)}</strong> is accurate. Thank you!`, "success"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } else if (action === "reject") {
    await supabase.from("verification_requests").update({ status: "completed" }).eq("id", request.id);
    await supabase.from("work_history").update({
      verification_status: "rejected",
      verification_method: "employer_email",
    }).eq("id", wh.id);

    return new Response(renderPage("Verification Rejected", 
      "You have indicated that this employment record is inaccurate. The employee has been notified.", "error"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response(renderPage("Invalid Action", "Unknown action.", "error"), {
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });
});

function renderPage(title: string, message: string, type: "success" | "error" | "info") {
  const color = type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#2563eb";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - TrueWork Verification</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:white;border-radius:16px;padding:48px;max-width:500px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
h1{color:${color};margin-bottom:16px;} p{color:#555;line-height:1.6;}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${message}</p></div></body></html>`;
}

function renderReviewPage(wh: any, token: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Employment Verification - TrueWork</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:white;border-radius:16px;padding:48px;max-width:560px;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
h1{color:#111;margin-bottom:8px;} .subtitle{color:#666;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;margin:24px 0;}
td{padding:12px;border:1px solid #e5e7eb;} td:first-child{font-weight:600;background:#f9fafb;width:40%;}
.actions{display:flex;gap:12px;margin-top:24px;}
.btn{flex:1;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center;display:block;}
.btn-confirm{background:#16a34a;color:white;} .btn-confirm:hover{background:#15803d;}
.btn-reject{background:#fee2e2;color:#dc2626;} .btn-reject:hover{background:#fecaca;}</style></head>
<body><div class="card">
<h1>Employment Verification</h1>
<p class="subtitle">Please review the following employment details and confirm or reject.</p>
<table>
<tr><td>Company</td><td>${escapeHtml(wh.company_name)}</td></tr>
<tr><td>Role</td><td>${escapeHtml(wh.role)}</td></tr>
<tr><td>Department</td><td>${escapeHtml(wh.department) || 'N/A'}</td></tr>
<tr><td>Type</td><td>${escapeHtml(wh.employment_type)}</td></tr>
<tr><td>Period</td><td>${escapeHtml(wh.start_date)} to ${escapeHtml(wh.end_date) || 'Present'}</td></tr>
</table>
<div class="actions">
<a href="?token=${encodeURIComponent(token)}&action=confirm" class="btn btn-confirm">✓ Confirm Employment</a>
<a href="?token=${encodeURIComponent(token)}&action=reject" class="btn btn-reject">✗ Reject</a>
</div>
<p style="color:#999;font-size:12px;margin-top:16px;">No account required. This link is secure and unique to this request.</p>
</div></body></html>`;
}
