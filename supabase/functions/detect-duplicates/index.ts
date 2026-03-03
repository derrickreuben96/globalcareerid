import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, national_id, email, created_at");

    if (profErr) throw profErr;

    // Get all employment records
    const { data: records } = await supabase
      .from("employment_records")
      .select("id, user_id, employer_id, start_date, end_date, job_title, status");

    const flagsToInsert: any[] = [];

    // Compare each pair of profiles
    for (let i = 0; i < (profiles || []).length; i++) {
      for (let j = i + 1; j < (profiles || []).length; j++) {
        const a = profiles![i];
        const b = profiles![j];
        let score = 0;
        const reasons: string[] = [];

        // Same full name
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase().trim();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase().trim();
        if (nameA === nameB) {
          score += 30;
          reasons.push("Identical full name");
        }

        // National ID similarity (minor variations)
        if (a.national_id && b.national_id) {
          const idA = a.national_id.replace(/[\s\-]/g, "").toLowerCase();
          const idB = b.national_id.replace(/[\s\-]/g, "").toLowerCase();
          if (idA === idB) {
            score += 40;
            reasons.push("Identical National ID");
          } else if (idA.length > 3 && idB.length > 3) {
            // Check if differ by 1-2 chars
            let diff = 0;
            const maxLen = Math.max(idA.length, idB.length);
            for (let k = 0; k < maxLen; k++) {
              if (idA[k] !== idB[k]) diff++;
            }
            if (diff <= 2) {
              score += 25;
              reasons.push("Similar National ID (minor variation)");
            }
          }
        }

        // Overlapping employment at same company
        const recordsA = (records || []).filter(r => r.user_id === a.user_id);
        const recordsB = (records || []).filter(r => r.user_id === b.user_id);
        
        for (const ra of recordsA) {
          for (const rb of recordsB) {
            if (ra.employer_id === rb.employer_id) {
              const startA = new Date(ra.start_date).getTime();
              const endA = ra.end_date ? new Date(ra.end_date).getTime() : Date.now();
              const startB = new Date(rb.start_date).getTime();
              const endB = rb.end_date ? new Date(rb.end_date).getTime() : Date.now();
              
              // Check date overlap
              if (startA <= endB && startB <= endA) {
                // Similar start dates (within 30 days)
                if (Math.abs(startA - startB) < 30 * 24 * 60 * 60 * 1000) {
                  score += 20;
                  reasons.push("Same company with similar start dates");
                }
                // Same job title
                if (ra.job_title.toLowerCase() === rb.job_title.toLowerCase()) {
                  score += 15;
                  reasons.push("Duplicate role at same company");
                }
              }
            }
          }
        }

        // Only flag if score is meaningful
        if (score >= 30) {
          flagsToInsert.push({
            profile_id: a.id,
            matched_profile_id: b.id,
            risk_score: Math.min(score, 100),
            risk_flag: score >= 50,
            risk_reasons: reasons,
            status: "pending",
          });
        }
      }
    }

    // Clear old pending flags and insert new ones
    await supabase.from("duplicate_risk_flags").delete().eq("status", "pending");
    
    if (flagsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("duplicate_risk_flags").insert(flagsToInsert);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ 
      flagsCreated: flagsToInsert.length,
      highRisk: flagsToInsert.filter(f => f.risk_flag).length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Duplicate detection error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
