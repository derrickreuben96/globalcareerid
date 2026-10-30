/**
 * Regression tests for the Oct 2026 security hardening.
 * Uses the public anon key (same as an unauthenticated browser) against the
 * live backend, plus a pure unit test of the server CORS allow-list.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { isAllowedOrigin } from "../../supabase/functions/_shared/allowedOrigins";

const SUPABASE_URL = "https://zlqkegqcgrggqldsbvem.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscWtlZ3FjZ3JnZ3FsZHNidmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODA5NDksImV4cCI6MjA4NjM1Njk0OX0.2_dwamBgeOxd1UxXab9y-bLBwgw3ibA5nkLCRLQd5Vw";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A real Career ID whose profile visibility is 'private'
const PRIVATE_CAREER_ID = "TW-2026-0C6EC";
const ZERO = "00000000-0000-0000-0000-000000000000";

describe("promotion approval authorization", () => {
  it("anonymous callers cannot approve promotions", async () => {
    const { error } = await anon.rpc("approve_promotion", { request_id_param: ZERO });
    expect(error).not.toBeNull();
  });
});

describe("public career lookup visibility", () => {
  it("private profile returns no profile data", async () => {
    const { data, error } = await anon.rpc("get_public_profile_by_id", { profile_id_param: PRIVATE_CAREER_ID });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("private profile returns no employment data", async () => {
    const { data, error } = await anon.rpc("get_employment_by_profile_id", { profile_id_param: PRIVATE_CAREER_ID });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anonymous callers cannot resolve a Career ID to an account", async () => {
    const { error } = await anon.rpc("resolve_career_id_for_employer", { profile_id_param: PRIVATE_CAREER_ID });
    expect(error).not.toBeNull();
  });
});

describe("internal function grants", () => {
  it.each([
    ["check_rate_limit", { event_type_param: "x", user_id_param: ZERO, max_attempts: 1, window_minutes: 1 }],
    ["verify_recovery_code", { target_user_id: ZERO, input_code_hash: "x" }],
    ["log_security_event", { event_type_param: "x", user_id_param: ZERO }],
    ["get_notification_preferences", { target_user_id: ZERO }],
  ])("anon cannot execute %s", async (fn, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await anon.rpc(fn as any, args as any);
    expect(error).not.toBeNull();
  });
});

describe("server CORS allow-list", () => {
  it("allows production and preview domains", () => {
    expect(isAllowedOrigin("https://www.globalcareerid.com")).toBe(true);
    expect(isAllowedOrigin("https://globalcareerid.com")).toBe(true);
    expect(isAllowedOrigin("https://id-preview--0a7945f4-acf7-4810-ac4b-09248a30f02b.lovable.app")).toBe(true);
    expect(isAllowedOrigin("http://localhost:8080")).toBe(true);
  });
  it("rejects other sites", () => {
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
    expect(isAllowedOrigin("https://globalcareerid.com.evil.io")).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
  });
});
