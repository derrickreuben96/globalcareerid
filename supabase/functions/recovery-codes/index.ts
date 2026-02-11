import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting constants
const MAX_VERIFY_ATTEMPTS = 5; // Max attempts per window
const RATE_LIMIT_WINDOW_MINUTES = 15; // Window in minutes

// Generate a cryptographically secure recovery code
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  for (let i = 0; i < 10; i++) {
    code += chars[array[i] % chars.length];
    if (i === 4) code += '-'; // Format: XXXXX-XXXXX
  }
  return code;
}

// Hash a recovery code using SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.replace('-', '').toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate recovery code format
function isValidCodeFormat(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  // Format: XXXXX-XXXXX (10 alphanumeric + 1 hyphen)
  const cleaned = code.replace('-', '').toUpperCase();
  return /^[A-Z0-9]{10}$/.test(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, code, userId } = body as { action?: unknown; code?: unknown; userId?: unknown };

    // Validate action
    if (typeof action !== 'string' || !['generate', 'verify', 'count'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "generate") {
      // Delete existing recovery codes for this user
      await supabaseAdmin
        .from("recovery_codes")
        .delete()
        .eq("user_id", user.id);

      // Generate 8 new recovery codes
      const codes: string[] = [];
      const codeRecords: { user_id: string; code_hash: string }[] = [];

      for (let i = 0; i < 8; i++) {
        const plainCode = generateRecoveryCode();
        codes.push(plainCode);
        const hashedCode = await hashCode(plainCode);
        codeRecords.push({
          user_id: user.id,
          code_hash: hashedCode,
        });
      }

      // Insert hashed codes
      const { error: insertError } = await supabaseAdmin
        .from("recovery_codes")
        .insert(codeRecords);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save recovery codes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log security event
      await supabaseAdmin.rpc('log_security_event', {
        event_type_param: 'recovery_codes_generated',
        user_id_param: user.id,
        metadata_param: { count: 8 }
      });

      // Return plain codes (only shown once)
      return new Response(
        JSON.stringify({ codes }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Validate code format
      if (!isValidCodeFormat(code)) {
        return new Response(
          JSON.stringify({ error: "Invalid recovery code format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For verification during login, userId comes from the request
      const targetUserId = (typeof userId === 'string' && userId) ? userId : user.id;

      // Check rate limit before processing
      const { data: canProceed, error: rateLimitError } = await supabaseAdmin
        .rpc('check_rate_limit', {
          event_type_param: 'recovery_code_attempt',
          user_id_param: targetUserId,
          max_attempts: MAX_VERIFY_ATTEMPTS,
          window_minutes: RATE_LIMIT_WINDOW_MINUTES
        });

      if (rateLimitError) {
        console.error("Rate limit check error:", rateLimitError);
      }

      if (!canProceed) {
        // Log blocked attempt
        await supabaseAdmin.rpc('log_security_event', {
          event_type_param: 'recovery_code_rate_limited',
          user_id_param: targetUserId,
          metadata_param: null
        });

        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the attempt
      await supabaseAdmin.rpc('log_security_event', {
        event_type_param: 'recovery_code_attempt',
        user_id_param: targetUserId,
        metadata_param: null
      });

      const hashedCode = await hashCode(code);

      // Use the database function to verify and mark code as used
      const { data, error: verifyError } = await supabaseAdmin
        .rpc("verify_recovery_code", {
          target_user_id: targetUserId,
          input_code_hash: hashedCode,
        });

      if (verifyError) {
        console.error("Verify error:", verifyError);
        return new Response(
          JSON.stringify({ error: "Verification failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log result
      if (data === true) {
        await supabaseAdmin.rpc('log_security_event', {
          event_type_param: 'recovery_code_success',
          user_id_param: targetUserId,
          metadata_param: null
        });
      }

      return new Response(
        JSON.stringify({ valid: data === true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "count") {
      // Get count of unused recovery codes
      const { count, error: countError } = await supabaseAdmin
        .from("recovery_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      if (countError) {
        console.error("Count error:", countError);
        return new Response(
          JSON.stringify({ error: "Failed to count codes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ count: count || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
