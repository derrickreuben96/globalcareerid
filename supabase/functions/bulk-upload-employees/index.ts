import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UploadRow {
  fullName: string;
  email: string;
  nationalId: string;
  passportNumber?: string;
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

interface EmailTask {
  to: string;
  fullName: string;
  profileId: string;
  roleTitle: string;
  companyName: string;
}

function buildWelcomeEmail(task: EmailTask, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="color:#111827;font-size:22px;margin:0 0 24px;">Welcome to TrueWork</h1>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hi ${task.fullName},
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${task.companyName}</strong> has added you as <strong>${task.roleTitle}</strong> on TrueWork.
      Your unique Career ID has been created:
    </p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px 24px;text-align:center;margin:0 0 24px;">
      <span style="font-size:24px;font-weight:700;letter-spacing:2px;color:#111827;">${task.profileId}</span>
    </div>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Your Career ID is your permanent professional identity. It links all verified employment records across your career.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      To claim your account and view your profile, use the <strong>"Forgot Password"</strong> option on the login page with your email address to set a password.
    </p>
    <a href="${appUrl}/login" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
      Claim Your Account
    </a>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:32px 0 0;">
      If you didn't expect this email, you can safely ignore it. Your data is secure.
    </p>
  </div>
</body>
</html>`;
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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
    const emailTasks: EmailTask[] = [];

    for (const row of rows) {
      try {
        const email = row.email?.trim().toLowerCase();
        const fullName = row.fullName?.trim();
        const nationalId = row.nationalId?.trim();
        const passportNumber = row.passportNumber?.trim() || null;
        const roleTitle = row.roleTitle?.trim();
        const startDate = row.startDate?.trim();
        const endDate = row.endDate?.trim() || null;
        const department = row.department?.trim() || null;

        if (!email || !fullName || !nationalId || !roleTitle || !startDate) {
          results.push({
            email: email || "",
            fullName: fullName || "",
            roleTitle: roleTitle || "",
            status: "error",
            message: "Missing required fields (name, email, national ID, role, start date)",
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

        // Step A: Check for existing profile by National ID first, then email
        let existingProfile: any = null;
        
        // Primary dedup: National ID
        const { data: profileByNatId } = await adminClient
          .from("profiles")
          .select("user_id, profile_id, first_name, last_name")
          .eq("national_id", nationalId)
          .maybeSingle();
        
        if (profileByNatId) {
          existingProfile = profileByNatId;
        } else {
          // Secondary dedup: Email
          const { data: profileByEmail } = await adminClient
            .from("profiles")
            .select("user_id, profile_id, first_name, last_name")
            .eq("email", email)
            .maybeSingle();
          existingProfile = profileByEmail;
        }

        let targetUserId: string;
        let targetProfileId: string;
        let isNewUser = false;

        if (existingProfile) {
          targetUserId = existingProfile.user_id;
          targetProfileId = existingProfile.profile_id;
          
          // Delta detection: update national_id/passport if missing on existing profile
          const updateFields: Record<string, any> = {};
          const { data: currentProf } = await adminClient
            .from("profiles")
            .select("national_id, passport_number")
            .eq("user_id", existingProfile.user_id)
            .maybeSingle();
          if (currentProf && !currentProf.national_id && nationalId) {
            updateFields.national_id = nationalId;
            updateFields.profile_complete = true;
          }
          if (currentProf && !currentProf.passport_number && passportNumber) {
            updateFields.passport_number = passportNumber;
          }
          if (Object.keys(updateFields).length > 0) {
            await adminClient.from("profiles").update(updateFields).eq("user_id", existingProfile.user_id);
          }
        } else {
          // No existing profile — create new auth user
          const nameParts = fullName.split(" ");
          const firstName = nameParts[0] || "User";
          const lastName = nameParts.slice(1).join(" ") || "";

          const tempPassword =
            crypto.randomUUID() + "!" + Math.random().toString(36).slice(2);
          const { data: newUser, error: createError } =
            await adminClient.auth.admin.createUser({
              email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                first_name: firstName,
                last_name: lastName,
                account_type: "career_individual",
                created_by_employer: employerId,
              },
            });

          if (createError || !newUser?.user) {
            if (
              createError?.message?.includes("already been registered") ||
              createError?.message?.includes("already exists")
            ) {
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
                    email, fullName, roleTitle, status: "error",
                    message: "User exists in auth but profile not found. Contact support.",
                  });
                  continue;
                }
              } else {
                results.push({
                  email, fullName, roleTitle, status: "error",
                  message: "Failed to resolve existing user",
                });
                continue;
              }
            } else {
              results.push({
                email, fullName, roleTitle, status: "error",
                message: createError?.message || "Failed to create user",
              });
              continue;
            }
          } else {
            targetUserId = newUser.user.id;
            isNewUser = true;
            // Wait briefly for trigger to create profile
            await new Promise((r) => setTimeout(r, 500));
            const { data: newProfile } = await adminClient
              .from("profiles")
              .select("profile_id")
              .eq("user_id", targetUserId)
              .maybeSingle();
            targetProfileId = newProfile?.profile_id || "PENDING";
            
            // Update profile with national_id and passport_number
            if (newProfile) {
              await adminClient
                .from("profiles")
                .update({
                  national_id: nationalId,
                  passport_number: passportNumber,
                  profile_complete: true,
                })
                .eq("user_id", targetUserId);
            }
          }
        }

        // Check for duplicate employment record
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
            email, fullName, roleTitle,
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
          results.push({ email, fullName, roleTitle, status: "error", message: insertError.message });
        } else {
          results.push({
            email, fullName, roleTitle,
            status: existingProfile ? "attached" : "created",
            profileId: targetProfileId!,
            message: existingProfile
              ? `Attached to existing Career ID ${targetProfileId}`
              : `New Career ID ${targetProfileId!} created`,
          });

          // Queue email for newly created users
          if (isNewUser && targetProfileId && targetProfileId !== "PENDING") {
            emailTasks.push({
              to: email,
              fullName,
              profileId: targetProfileId!,
              roleTitle,
              companyName: employer.company_name,
            });
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

    // Send welcome emails in parallel (best-effort, don't fail the upload)
    if (resendApiKey && emailTasks.length > 0) {
      const resend = new Resend(resendApiKey);
      const appUrl = supabaseUrl.replace(".supabase.co", "").includes("//")
        ? "https://truework.app" // fallback
        : "https://truework.app";

      // Determine app URL from origin header or fallback
      const originUrl = req.headers.get("origin") || "https://truework.app";

      await Promise.allSettled(
        emailTasks.map((task) =>
          resend.emails.send({
            from: "TrueWork <noreply@resend.dev>",
            to: [task.to],
            subject: `Your Career ID: ${task.profileId} — Welcome to TrueWork`,
            html: buildWelcomeEmail(task, originUrl),
          }).then((res) => {
            if (res.error) console.error(`Email to ${task.to} failed:`, res.error);
            else console.log(`Welcome email sent to ${task.to}`);
          })
        )
      );
    }

    const created = results.filter((r) => r.status === "created").length;
    const attached = results.filter((r) => r.status === "attached").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({
        results,
        summary: { created, attached, errors, emailsSent: emailTasks.length },
      }),
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
