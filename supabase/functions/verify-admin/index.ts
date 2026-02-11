import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Authentication required" }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Validate JWT token format
    if (!token.includes(".") || token.split(".").length !== 3) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Invalid authentication token" }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Invalid or expired session" }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has admin role using the database function
    const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
      _role: 'admin',
      _user_id: userData.user.id
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Failed to verify admin role" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log admin access attempt for audit
    if (hasAdminRole) {
      console.log(`Admin access verified for user: ${userData.user.id}`);
    } else {
      console.log(`Non-admin access attempt by user: ${userData.user.id}`);
    }

    return new Response(
      JSON.stringify({ 
        isAdmin: !!hasAdminRole,
        userId: userData.user.id 
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Admin verification error:", error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: "Server error during verification" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
