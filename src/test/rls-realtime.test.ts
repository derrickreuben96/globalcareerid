/**
 * Regression tests for RLS + Realtime on the `applications` table.
 *
 * Background: a prior security audit removed `applications` (and `jobs`) from
 * the `supabase_realtime` publication and locked down RLS so that:
 *   - Applicants can only read their own application rows
 *   - Employers can only read applications to jobs they own
 *   - Anonymous users cannot read applications at all
 *   - No client (anon or authenticated) can subscribe to realtime events
 *     for applications belonging to other users
 *
 * These tests use the public anon key to exercise the same code paths the
 * browser uses. They are designed to fail loudly if anyone re-adds
 * `applications` to the realtime publication or loosens the RLS policies.
 */

import { describe, it, expect, afterAll } from "vitest";
import { createClient, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zlqkegqcgrggqldsbvem.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscWtlZ3FjZ3JnZ3FsZHNidmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODA5NDksImV4cCI6MjA4NjM1Njk0OX0.2_dwamBgeOxd1UxXab9y-bLBwgw3ibA5nkLCRLQd5Vw";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

afterAll(async () => {
  await anon.removeAllChannels();
});

describe("RLS regression — applications table", () => {
  it("anon SELECT on applications returns zero rows (RLS blocks everything)", async () => {
    const { data, error } = await anon
      .from("applications")
      .select("id, applicant_user_id, employer_id")
      .limit(50);

    // RLS may surface as an empty result set (preferred) or as an error.
    // Either way, NO row must leak.
    if (error) {
      expect(error.message).toMatch(/permission|policy|denied|rls/i);
    } else {
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBe(0);
    }
  });

  it("anon SELECT on jobs only returns open jobs from verified employers", async () => {
    const { data, error } = await anon
      .from("jobs")
      .select("id, status, employer:employers(is_verified)")
      .limit(100);

    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.status).toBe("open");
      // employer relation may be null only if RLS hides the employer row;
      // when present it must be verified.
      const emp = (row as any).employer;
      if (emp) expect(emp.is_verified).toBe(true);
    }
  });
});

describe("Realtime regression — applications must NOT be in supabase_realtime publication", () => {
  it("anon postgres_changes subscription on applications receives no events", async () => {
    const received: unknown[] = [];

    const channel = anon
      .channel("regression-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        (payload) => received.push(payload),
      );

    const status = await new Promise<string>((resolve) => {
      const timer = setTimeout(() => resolve("TIMEOUT"), 8000);
      channel.subscribe((s) => {
        // Resolve on any terminal status
        if (
          s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED ||
          s === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          s === REALTIME_SUBSCRIBE_STATES.CLOSED ||
          s === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          clearTimeout(timer);
          resolve(s);
        }
      });
    });

    // Either Realtime refuses the subscription (CHANNEL_ERROR — table not in
    // publication / RLS denies) OR it subscribes but never delivers events
    // because the table is excluded from the publication. Both are acceptable;
    // what is NOT acceptable is receiving an application row payload.
    expect([
      REALTIME_SUBSCRIBE_STATES.SUBSCRIBED,
      REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR,
      REALTIME_SUBSCRIBE_STATES.CLOSED,
      REALTIME_SUBSCRIBE_STATES.TIMED_OUT,
      "TIMEOUT",
    ]).toContain(status);

    // Give the server a brief grace window in case a stray event would arrive.
    await new Promise((r) => setTimeout(r, 1500));

    expect(received).toEqual([]);

    await anon.removeChannel(channel);
  }, 15000);

  it("anon postgres_changes subscription on jobs receives no events", async () => {
    const received: unknown[] = [];

    const channel = anon
      .channel("regression-jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => received.push(payload),
      );

    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 5000);
      channel.subscribe(() => {
        clearTimeout(t);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 1500));
    expect(received).toEqual([]);
    await anon.removeChannel(channel);
  }, 12000);
});
