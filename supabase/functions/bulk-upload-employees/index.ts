import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendCareerIdEmail(
  email: string,
  fullName: string,
  profileId: string,
  companyName: string,
  roleTitle: string,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — skipping welcome email for", email);
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Welcome to Global Career ID</h2>
      <p>Hi <strong>${fullName}</strong>,</p>
      <p><strong>${companyName}</strong> has added you as a <strong>${roleTitle}</strong> on the Global Career ID platform.</p>
      <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Your Career ID</p>
        <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #1a1a2e;">${profileId}</p>
      </div>
      <p>Your Career ID is your unique, portable professional identity. Use it to:</p>
      <ul>
        <li>Share your verified employment history with recruiters</li>
        <li>Build a trusted professional profile</li>
        <li>Claim and manage your account</li>
      </ul>
      <p>To claim your account and set your password, visit the platform and use the <strong>Forgot Password</strong> option with this email address.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">This is an automated message from Global Career ID.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Global Career ID <onboarding@resend.dev>",
        to: [email],
        subject: `Your Career ID from ${companyName}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Failed to send email to", email, body);
    } else {
      console.log("Welcome email sent to", email);
    }
  } catch (err) {
    console.error("Email send error for", email, err);
  }
}

interface UploadRow {
  fullName: string;
  email: string;
  roleTitle: string;
  startDate: string;
  endDate?: string;
  department?: string;
}

interface ResultRow {
  email: string;
  fullName: string;
  roleTitle: string;
  status: "created" | "attached" | "error";
  message: string;
  profileId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an authenticated employer
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rows, employerId } = (await req.json()) as {
      rows: UploadRow[];
      employerId: string;
    };

    if (!rows || !employerId) {
      return new Response(
        JSON.stringify({ error: "Missing rows or employerId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify caller owns this employer record
    const { data: employer } = await userClient
      .from("employers")
      .select("id, is_verified, company_name")
      .eq("id", employerId)
      .eq("user_id", user.id)
      .single();

    if (!employer) {
      return new Response(
        JSON.stringify({ error: "Employer not found or not owned by you" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!employer.is_verified) {
      return new Response(
        JSON.stringify({
          error: "Your company must be verified before adding employees",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const results: ResultRow[] = [];

    for (const row of rows) {
      try {
        const email = row.email?.trim().toLowerCase();
        const fullName = row.fullName?.trim();
        const roleTitle = row.roleTitle?.trim();
        const startDate = row.startDate?.trim();
        const endDate = row.endDate?.trim() || null;
        const department = row.department?.trim() || null;

        if (!email || !fullName || !roleTitle || !startDate) {
          results.push({
            email: email || "",
            fullName: fullName || "",
            roleTitle: roleTitle || "",
            status: "error",
            message: "Missing required fields (name, email, role, start date)",
          });
          continue;
        }

        // Date validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate)) {
          results.push({
            email,
            fullName,
            roleTitle,
            status: "error",
            message: "Invalid start date format (use YYYY-MM-DD)",
          });
          continue;
        }

        // Step A: Check for existing profile by email
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("user_id, profile_id, first_name, last_name")
          .eq("email", email)
          .maybeSingle();

        let targetUserId: string;
        let targetProfileId: string;

        if (existingProfile) {
          // Existing Career ID found — attach employment record
          targetUserId = existingProfile.user_id;
          targetProfileId = existingProfile.profile_id;
        } else {
          // No existing profile — create new auth user (which triggers handle_new_user)
          const nameParts = fullName.split(" ");
          const firstName = nameParts[0] || "User";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Create auth user with a random password (they'll need to claim via email)
          const tempPassword =
            crypto.randomUUID() + "!" + Math.random().toString(36).slice(2);
          const { data: newUser, error: createError } =
            await adminClient.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true, // auto-confirm so records can be attached
              user_metadata: {
                first_name: firstName,
                last_name: lastName,
                account_type: "career_individual",
                created_by_employer: employerId,
              },
            });

          if (createError || !newUser?.user) {
            // Could be a duplicate in auth but not in profiles
            if (
              createError?.message?.includes("already been registered") ||
              createError?.message?.includes("already exists")
            ) {
              // User exists in auth but not in profiles — find them by email
              const { data: existingUsers, error: listError } =
                await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
              
              if (listError) {
                results.push({ email, fullName, roleTitle, status: "error", message: "Failed to look up existing user" });
                continue;
              }
              
              const existingAuthUser = existingUsers?.users?.find(
                (u) => u.email === email
              );
              if (existingAuthUser) {
                // Get their profile
                const { data: prof } = await adminClient
                  .from("profiles")
                  .select("user_id, profile_id")
                  .eq("user_id", existingAuthUser.id)
                  .maybeSingle();
                if (prof) {
                  targetUserId = prof.user_id;
                  targetProfileId = prof.profile_id;
                } else {
                  results.push({
                    email,
                    fullName,
                    roleTitle,
                    status: "error",
                    message:
                      "User exists in auth but profile not found. Contact support.",
                  });
                  continue;
                }
              } else {
                results.push({
                  email,
                  fullName,
                  roleTitle,
                  status: "error",
                  message: "Failed to resolve existing user",
                });
                continue;
              }
            } else {
              results.push({
                email,
                fullName,
                roleTitle,
                status: "error",
                message: createError?.message || "Failed to create user",
              });
              continue;
            }
          } else {
            targetUserId = newUser.user.id;
            // Wait briefly for trigger to create profile
            await new Promise((r) => setTimeout(r, 500));
            const { data: newProfile } = await adminClient
              .from("profiles")
              .select("profile_id")
              .eq("user_id", targetUserId)
              .maybeSingle();
            targetProfileId = newProfile?.profile_id || "PENDING";
          }
        }

        // Check if this exact role already exists to prevent duplicates
        const { data: existingRecord } = await adminClient
          .from("employment_records")
          .select("id")
          .eq("user_id", targetUserId!)
          .eq("employer_id", employerId)
          .eq("job_title", roleTitle)
          .eq("start_date", startDate)
          .maybeSingle();

        if (existingRecord) {
          results.push({
            email,
            fullName,
            roleTitle,
            status: "attached",
            profileId: targetProfileId!,
            message: "Employment record already exists — skipped",
          });
          continue;
        }

        // Create employment record
        const { error: insertError } = await adminClient
          .from("employment_records")
          .insert({
            user_id: targetUserId!,
            employer_id: employerId,
            job_title: roleTitle,
            department,
            employment_type: "full_time",
            start_date: startDate,
            end_date: endDate,
            status: "active",
          });

        if (insertError) {
          results.push({
            email,
            fullName,
            roleTitle,
            status: "error",
            message: insertError.message,
          });
        } else {
          const isNew = !existingProfile;
          results.push({
            email,
            fullName,
            roleTitle,
            status: isNew ? "created" : "attached",
            profileId: targetProfileId!,
            message: isNew
              ? `New Career ID ${targetProfileId!} created`
              : `Attached to existing Career ID ${targetProfileId}`,
          });

          // Send welcome email with Career ID to newly created employees
          if (isNew && targetProfileId && targetProfileId !== "PENDING") {
            sendCareerIdEmail(email, fullName, targetProfileId, employer.company_name, roleTitle);
          }
        }
      } catch (rowError) {
        results.push({
          email: row.email || "",
          fullName: row.fullName || "",
          roleTitle: row.roleTitle || "",
          status: "error",
          message: String(rowError),
        });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const attached = results.filter((r) => r.status === "attached").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ results, summary: { created, attached, errors } }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
