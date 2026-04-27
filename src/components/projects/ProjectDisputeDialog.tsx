import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
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

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to flag this record.");
      const parsed = reasonSchema.safeParse(reason);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid reason");
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
    },
    onSuccess: () => {
      toast.success("Dispute submitted. Our team will review shortly.");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setReason("");
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Failed to submit dispute"),
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
                {reason.trim().length}/2000 characters
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={!user || submit.isPending || reason.trim().length < 20}
          >
            {submit.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
