import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Flag, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { z } from "zod";

interface Props {
  projectId: string;
  isSealed?: boolean;
  /** When true the dispute can also flip the project status to 'disputed' (non-sealed only). */
  changeStatus?: boolean;
  triggerLabel?: string;
  triggerVariant?: "outline" | "ghost" | "destructive" | "secondary";
}

const reasonSchema = z
  .string()
  .trim()
  .min(20, "Please describe the issue (min 20 characters)")
  .max(2000, "Reason is too long (max 2000 characters)");

const THROTTLE_MS = 24 * 60 * 60 * 1000; // 1 day
const storageKey = (projectId: string, userId: string) =>
  `gcid:dispute:${projectId}:${userId}`;

function readLastSubmission(projectId: string, userId: string): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(storageKey(projectId, userId));
    if (!raw) return null;
    const ts = Number.parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function writeLastSubmission(projectId: string, userId: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(projectId, userId), String(Date.now()));
  } catch {
    /* ignore quota / privacy mode */
  }
}

function formatRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${totalMin}m`;
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/duplicate key|already exists|unique/i.test(msg)) {
    return "You've already submitted a dispute for this project recently.";
  }
  if (/violates row-level security|permission denied|forbidden/i.test(msg)) {
    return "You don't have permission to dispute this project.";
  }
  if (/network|failed to fetch/i.test(msg)) {
    return "Network error — please check your connection and retry.";
  }
  return msg || "Failed to submit dispute. Please try again.";
}

export function ProjectDisputeDialog({
  projectId,
  isSealed = false,
  changeStatus = false,
  triggerLabel = "Flag inaccuracy",
  triggerVariant = "outline",
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [throttleUntil, setThrottleUntil] = useState<number | null>(null);
  const [, force] = useState(0);

  // Re-evaluate throttle whenever dialog opens or user changes.
  useEffect(() => {
    if (!user) {
      setThrottleUntil(null);
      return;
    }
    const last = readLastSubmission(projectId, user.id);
    setThrottleUntil(last ? last + THROTTLE_MS : null);
  }, [user, projectId, open]);

  // Tick to refresh remaining-time label every minute while throttled & open.
  useEffect(() => {
    if (!open || !throttleUntil) return;
    const id = window.setInterval(() => force((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open, throttleUntil]);

  const remaining = throttleUntil ? Math.max(0, throttleUntil - Date.now()) : 0;
  const isThrottled = remaining > 0;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to flag this record.");

      // Client-side throttle gate
      const last = readLastSubmission(projectId, user.id);
      if (last && Date.now() - last < THROTTLE_MS) {
        throw new Error(
          `You can submit one dispute per project per day. Try again in ${formatRemaining(
            last + THROTTLE_MS - Date.now()
          )}.`
        );
      }

      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid reason");
      }

      // Server-side guard: check for an existing recent dispute by this user.
      const since = new Date(Date.now() - THROTTLE_MS).toISOString();
      const { data: existing, error: existingErr } = await (supabase as any)
        .from("project_dispute_log" as never)
        .select("id, created_at")
        .eq("project_id", projectId)
        .eq("raised_by", user.id)
        .gte("created_at", since)
        .limit(1);

      if (existingErr) throw existingErr;
      if (existing && existing.length > 0) {
        const ts = new Date((existing[0] as any).created_at).getTime();
        writeLastSubmission(projectId, user.id);
        throw new Error(
          `You've already disputed this project. You can submit another in ${formatRemaining(
            ts + THROTTLE_MS - Date.now()
          )}.`
        );
      }

      const { error: insErr } = await (supabase as any)
        .from("project_dispute_log" as never)
        .insert({ project_id: projectId, raised_by: user.id, reason: parsed.data });
      if (insErr) throw insErr;

      if (changeStatus && !isSealed) {
        await (supabase as any)
          .from("projects" as never)
          .update({ status: "disputed" })
          .eq("id", projectId);
      }

      writeLastSubmission(projectId, user.id);
    },
    onSuccess: () => {
      toast.success("Dispute submitted. Our team will review shortly.");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setReason("");
      setError(null);
      if (user) setThrottleUntil(Date.now() + THROTTLE_MS);
    },
    onError: (e: unknown) => setError(friendlyError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="gap-2">
          <Flag className="w-4 h-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Flag an inaccuracy</DialogTitle>
          <DialogDescription>
            Submit a dispute to flag incorrect information. The original employer-authored
            record is not modified — admins will investigate and resolve.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              You need to{" "}
              <Link to="/login" className="text-primary underline">
                sign in
              </Link>{" "}
              before flagging this record.
            </AlertDescription>
          </Alert>
        ) : isThrottled ? (
          <Alert>
            <Clock className="w-4 h-4" />
            <AlertDescription>
              You've already submitted a dispute for this project. You can submit another in{" "}
              <strong>{formatRemaining(remaining)}</strong>.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="dispute-reason">What is inaccurate?</Label>
              <Textarea
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue with this project record (dates, scope, role, outcomes…)."
                rows={5}
                maxLength={2000}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {reason.trim().length}/2000 characters · limit 1 dispute per project per day
              </p>
            </div>
            {isSealed && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Sealed records are immutable. Your dispute will be logged for admin review;
                  the signed record itself stays intact.
                </AlertDescription>
              </Alert>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {isThrottled ? "Close" : "Cancel"}
          </Button>
          {!isThrottled && (
            <Button
              onClick={() => submit.mutate()}
              disabled={!user || submit.isPending || reason.trim().length < 20}
            >
              {submit.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Submit dispute
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
