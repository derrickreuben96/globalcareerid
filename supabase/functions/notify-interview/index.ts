// Notify candidate when employer moves an application to "interview".
// Uses Resend via the connector gateway with LOVABLE_API_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth guard — only the owning employer (or admin) may notify
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: userData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = userData.user.id;

    const { application_id } = await req.json().catch(() => ({}));
    if (!application_id || typeof application_id !== 'string') {
      return new Response(JSON.stringify({ error: 'application_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: app } = await supabase
      .from('applications')
      .select('id, status, applicant_user_id, employer_id, job:jobs(title), employer:employers(company_name, user_id)')
      .eq('id', application_id)
      .maybeSingle();

    if (!app) {
      return new Response(JSON.stringify({ error: 'not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: callerId, _role: 'admin' });
    if (!isAdmin && (app as any).employer?.user_id !== callerId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (app.status !== 'interview') {
      return new Response(JSON.stringify({ error: 'application is not in interview stage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase
      .from('profiles').select('email, first_name')
      .eq('user_id', app.applicant_user_id).maybeSingle();
    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'applicant email missing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // In-app notification (always)
    await supabase.from('in_app_notifications').insert({
      user_id: app.applicant_user_id,
      title: 'Interview invitation',
      message: `${(app as any).employer?.company_name ?? 'An employer'} invited you to interview for ${(app as any).job?.title ?? 'a role'}.`,
      type: 'success',
      link: '/dashboard',
    });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ ok: true, email_sent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const company = (app as any).employer?.company_name ?? 'The hiring team';
    const title = (app as any).job?.title ?? 'the role';
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;">
        <h2 style="color:#0d3b66;">You've been invited to interview</h2>
        <p>Hi ${profile.first_name ?? 'there'},</p>
        <p><strong>${company}</strong> has moved your application for <strong>${title}</strong> to the interview stage.</p>
        <p>They will reach out to you with the next steps. You can follow your application status anytime from your Global Career ID dashboard.</p>
        <p style="margin-top:24px;color:#64748b;font-size:12px;">— Global Career ID</p>
      </div>`;

    const r = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Global Career ID <onboarding@resend.dev>',
        to: [profile.email],
        subject: `Interview invitation — ${title}`,
        html,
      }),
    });

    return new Response(JSON.stringify({ ok: true, email_sent: r.ok }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
