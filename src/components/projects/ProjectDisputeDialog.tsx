import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Flag, Loader2, Clock, ChevronLeft, Download, CheckCircle2 } from "lucide-react";
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

interface SubmittedReceipt {
  disputeId: string | null;
  projectId: string;
  raisedBy: string;
  reason: string;
  submittedAt: string;
  isSealed: boolean;
}

type Step = "compose" | "review" | "done";

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
  const [step, setStep] = useState<Step>("compose");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [throttleUntil, setThrottleUntil] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<SubmittedReceipt | null>(null);
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

  // Reset to compose step whenever the dialog re-opens (unless we're showing the receipt)
  useEffect(() => {
    if (open) {
      if (step === "done" && receipt) return;
      setStep("compose");
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick to refresh remaining-time label every minute while throttled & open.
  useEffect(() => {
    if (!open || !throttleUntil) return;
    const id = window.setInterval(() => force((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open, throttleUntil]);

  const remaining = throttleUntil ? Math.max(0, throttleUntil - Date.now()) : 0;
  const isThrottled = remaining > 0 && step !== "done";

  const submit = useMutation({
    mutationFn: async (): Promise<SubmittedReceipt> => {
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

      const { data: inserted, error: insErr } = await (supabase as any)
        .from("project_dispute_log" as never)
        .insert({ project_id: projectId, raised_by: user.id, reason: parsed.data })
        .select("id, created_at")
        .maybeSingle();
      if (insErr) throw insErr;

      if (changeStatus && !isSealed) {
        await (supabase as any)
          .from("projects" as never)
          .update({ status: "disputed" })
          .eq("id", projectId);
      }

      writeLastSubmission(projectId, user.id);

      return {
        disputeId: (inserted as any)?.id ?? null,
        projectId,
        raisedBy: user.id,
        reason: parsed.data,
        submittedAt: (inserted as any)?.created_at ?? new Date().toISOString(),
        isSealed,
      };
    },
    onSuccess: (r) => {
      toast.success("Dispute submitted. Our team will review shortly.");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setReceipt(r);
      setStep("done");
      setError(null);
      if (user) setThrottleUntil(Date.now() + THROTTLE_MS);
    },
    onError: (e: unknown) => setError(friendlyError(e)),
  });

  const downloadEvidence = () => {
    if (!receipt) return;
    const bundle = {
      bundle: "Global Career ID — Dispute Evidence",
      generated_at: new Date().toISOString(),
      dispute: {
        id: receipt.disputeId,
        project_id: receipt.projectId,
        raised_by: receipt.raisedBy,
        submitted_at: receipt.submittedAt,
        sealed_record: receipt.isSealed,
        reason: receipt.reason,
      },
      verification_url:
        typeof window !== "undefined"
          ? `${window.location.origin}/project/${receipt.projectId}`
          : `/project/${receipt.projectId}`,
      notes:
        "Sealed records are immutable. This dispute has been logged for admin review and does not modify the cryptographically signed record. Retain this file as evidence of submission.",
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeId = (receipt.disputeId ?? receipt.projectId).slice(0, 12);
    a.href = url;
    a.download = `dispute_evidence_${safeId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Evidence bundle downloaded");
  };

  const handleClose = () => {
    setOpen(false);
    // Reset receipt only after the dialog has closed
    setTimeout(() => {
      setReceipt(null);
      setReason("");
      setStep("compose");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="gap-2">
          <Flag className="w-4 h-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "review"
              ? "Review your dispute"
              : step === "done"
              ? "Dispute submitted"
              : "Flag an inaccuracy"}
          </DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "Confirm the details below before submitting. This will be sent to our review team."
              : step === "done"
              ? "Your dispute has been logged. Download an evidence bundle for your records."
              : "Submit a dispute to flag incorrect information. The original employer-authored record is not modified — admins will investigate and resolve."}
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
        ) : step === "compose" ? (
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
        ) : step === "review" ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Project ID</span>
                <code className="font-mono break-all text-right">{projectId}</code>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Submitted by</span>
                <code className="font-mono break-all text-right">{user.id}</code>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Record type</span>
                <span>{isSealed ? "Sealed (immutable)" : "Editable"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Will be sent at</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <div className="mt-1 rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
                {reason.trim()}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          // step === "done"
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-verified">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">Dispute logged successfully</p>
            </div>
            {receipt && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Dispute ID</span>
                  <code className="font-mono break-all text-right">
                    {receipt.disputeId ?? "—"}
                  </code>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Project ID</span>
                  <code className="font-mono break-all text-right">{receipt.projectId}</code>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Submitted at</span>
                  <span>{new Date(receipt.submittedAt).toLocaleString()}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Save the evidence bundle as proof of submission. Our team will follow up via your
              registered email.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "compose" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {isThrottled ? "Close" : "Cancel"}
              </Button>
              {!isThrottled && (
                <Button
                  onClick={() => {
                    const parsed = reasonSchema.safeParse(reason);
                    if (!parsed.success) {
                      setError(parsed.error.issues[0]?.message ?? "Invalid reason");
                      return;
                    }
                    setError(null);
                    setStep("review");
                  }}
                  disabled={!user || reason.trim().length < 20}
                >
                  Review
                </Button>
              )}
            </>
          )}

          {step === "review" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("compose")}
                disabled={submit.isPending}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Edit
              </Button>
              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
              >
                {submit.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Confirm & submit
              </Button>
            </>
          )}

          {step === "done" && (
            <>
              <Button variant="outline" onClick={downloadEvidence} className="gap-2">
                <Download className="w-4 h-4" /> Download evidence
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
