import { useEffect, useState } from "react";

export type RevocationState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "active" }
  | { phase: "revoked"; at?: string }
  | { phase: "error"; reason: string };

/**
 * Checks whether a signed JWT has been revoked / superseded by calling the
 * `check-revocation` edge function. Safe to call from any client component.
 */
export function useRevocationStatus(jwt: string | null | undefined, enabled = true) {
  const [state, setState] = useState<RevocationState>({ phase: "idle" });

  useEffect(() => {
    if (!enabled || !jwt) {
      setState({ phase: "idle" });
      return;
    }
    let cancelled = false;
    setState({ phase: "checking" });

    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/check-revocation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jwt }),
          }
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        if (body?.revoked) {
          setState({ phase: "revoked", at: body.revoked_at });
        } else {
          setState({ phase: "active" });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            phase: "error",
            reason: e instanceof Error ? e.message : "Failed to check revocation",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jwt, enabled]);

  return state;
}
