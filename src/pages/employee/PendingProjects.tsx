import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePendingProjects, useConfirmProject, useDisputeProject } from "@/hooks/useProjects";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PendingProjects() {
  const { data: projects = [], isLoading } = usePendingProjects();
  const confirmM = useConfirmProject();
  const disputeM = useDisputeProject();
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-semibold mb-2">Pending Project Confirmations</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Review projects an employer wants to add to your verified record.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
            No pending projects.
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="glass-card rounded-2xl p-6 space-y-3">
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-sm">{p.description}</p>
                {p.measurable_outcome && (
                  <div className="p-3 bg-verified/5 border border-verified/20 rounded text-sm">
                    <strong>Outcome:</strong> {p.measurable_outcome}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(p.start_date).toLocaleDateString()} —{" "}
                  {p.end_date ? new Date(p.end_date).toLocaleDateString() : "Present"}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="gap-2"
                    disabled={confirmM.isPending}
                    onClick={async () => {
                      try {
                        await confirmM.mutateAsync(p.id);
                        toast.success("Project added to your verified record");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm & Add to My Record
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => { setDisputeId(p.id); setReason(""); }}>
                    <AlertTriangle className="w-4 h-4" /> Dispute
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={!!disputeId} onOpenChange={(o) => !o && setDisputeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispute this project</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Explain why you're disputing this project entry..."
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || disputeM.isPending}
              onClick={async () => {
                if (!disputeId) return;
                try {
                  await disputeM.mutateAsync({ id: disputeId, reason });
                  toast.success("Dispute submitted");
                  setDisputeId(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
