// AI-powered application scoring. Computes role relevance, experience duration,
// stability, and verification integrity into ai_score and confidence_score.
// Non-blocking: failures do not affect the application itself.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SnapshotRecord {
  job_title?: string;
  department?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  company_name?: string | null;
}

function monthsBetween(start?: string | null, end?: string | null): number {
  if (!start) return 0;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, m);
}

function tokenize(s: string): string[] {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a); const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { application_id } = await req.json().catch(() => ({}));
    if (!application_id || typeof application_id !== 'string') {
      return new Response(JSON.stringify({ error: 'application_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, job_id, employment_snapshot, applicant_user_id')
      .eq('id', application_id)
      .maybeSingle();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: job } = await supabase
      .from('jobs').select('title, description, role_category')
      .eq('id', app.job_id).maybeSingle();

    const snapshot: SnapshotRecord[] = Array.isArray(app.employment_snapshot)
      ? app.employment_snapshot as SnapshotRecord[] : [];

    // 1) Role relevance — token overlap of job title/category vs candidate role titles
    const jobTokens = tokenize(`${job?.title ?? ''} ${job?.role_category ?? ''} ${job?.description ?? ''}`);
    const roleTokens = tokenize(snapshot.map(r => `${r.job_title ?? ''} ${r.department ?? ''}`).join(' '));
    const relevance = jaccard(jobTokens, roleTokens); // 0..1

    // 2) Experience duration — total months across snapshot, capped at 120 months
    const totalMonths = snapshot.reduce((sum, r) => sum + monthsBetween(r.start_date, r.end_date), 0);
    const durationScore = Math.min(1, totalMonths / 120);

    // 3) Stability — average tenure per role; longer is better, cap at 36 months avg
    const avgTenure = snapshot.length ? totalMonths / snapshot.length : 0;
    const stabilityScore = Math.min(1, avgTenure / 36);

    // 4) Verification integrity — proportion of records that are employer-verified (active/ended)
    const verifiedCount = snapshot.filter(r => r.status === 'active' || r.status === 'ended').length;
    const integrityScore = snapshot.length ? verifiedCount / snapshot.length : 0;

    const ai_score = Math.round(
      (relevance * 0.40 + durationScore * 0.25 + stabilityScore * 0.15 + integrityScore * 0.20) * 100,
    );

    // Confidence reflects how much signal we have (records present + token overlap presence)
    const confidence_score = Math.round(
      (Math.min(1, snapshot.length / 3) * 0.6 + Math.min(1, jobTokens.length / 8) * 0.4) * 100,
    );

    const ai_explanation =
      `Role relevance ${(relevance * 100).toFixed(0)}%, ` +
      `${totalMonths} months total experience across ${snapshot.length} role(s), ` +
      `avg tenure ${avgTenure.toFixed(1)} months, ` +
      `${verifiedCount}/${snapshot.length} employer-verified.`;

    const { error: updErr } = await supabase
      .from('applications')
      .update({ ai_score, confidence_score, ai_explanation })
      .eq('id', application_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ai_score, confidence_score, ai_explanation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
