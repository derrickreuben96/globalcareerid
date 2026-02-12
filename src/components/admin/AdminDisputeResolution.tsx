import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Dispute {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
  employment_record_id: string;
  user: {
    first_name: string;
    last_name: string;
    profile_id: string;
  } | null;
  employment_record: {
    job_title: string;
    employer: { company_name: string } | null;
  } | null;
}

interface Props {
  disputes: Dispute[];
  onRefresh: () => void;
}

export function AdminDisputeResolution({ disputes, onRefresh }: Props) {
  const { user, session } = useAuth();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDisputes =
    statusFilter === "all"
      ? disputes
      : disputes.filter((d) => d.status === statusFilter);

  const handleAISuggestion = async (dispute: Dispute) => {
    if (!session) return;
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-ai-assist",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "dispute_summary",
            data: {
              dispute: {
                user_name: dispute.user
                  ? `${dispute.user.first_name} ${dispute.user.last_name}`
                  : "Unknown",
                job_title:
                  dispute.employment_record?.job_title || "Unknown position",
                company_name:
                  dispute.employment_record?.employer?.company_name ||
                  "Unknown company",
                reason: dispute.reason,
                status: dispute.status,
                created_at: dispute.created_at,
              },
            },
          },
        }
      );
      if (error) throw error;
      setAiSuggestion(data.result);
    } catch {
      toast.error("Failed to generate AI suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  const handleResolve = async (status: "resolved" | "rejected") => {
    if (!selectedDispute || !user) return;
    setProcessing(true);

    const { error } = await supabase
      .from("disputes")
      .update({
        status,
        admin_notes: adminNotes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selectedDispute.id);

    if (error) {
      toast.error("Failed to update dispute");
      setProcessing(false);
      return;
    }

    toast.success(`Dispute ${status}`);
    setSelectedDispute(null);
    setAdminNotes("");
    setAiSuggestion("");
    setProcessing(false);
    onRefresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="text-warning border-warning gap-1">
            <Clock className="w-3 h-3" />
            Open
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="w-3 h-3" />
            Under Review
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-verified text-verified-foreground gap-1">
            <CheckCircle className="w-3 h-3" />
            Resolved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Dispute Resolution
          </h2>
          <p className="text-sm text-muted-foreground">
            {disputes.filter((d) => d.status === "open").length} open •{" "}
            {disputes.filter((d) => d.status === "resolved").length} resolved
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredDisputes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No disputes found.</p>
          </div>
        ) : (
          filteredDisputes.map((dispute) => (
            <div
              key={dispute.id}
              className="p-5 border border-border rounded-xl hover:shadow-md transition-all bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {dispute.user?.first_name} {dispute.user?.last_name}
                    </h3>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {dispute.user?.profile_id}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Re: {dispute.employment_record?.job_title} at{" "}
                    {dispute.employment_record?.employer?.company_name}
                  </p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg line-clamp-2">
                    &ldquo;{dispute.reason}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Filed {new Date(dispute.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(dispute.status)}
                  {(dispute.status === "open" ||
                    dispute.status === "under_review") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setAdminNotes("");
                        setAiSuggestion("");
                      }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedDispute}
        onOpenChange={() => setSelectedDispute(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground text-xs">
                  Dispute Reason
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">
                  &ldquo;{selectedDispute.reason}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">User</Label>
                  <p>
                    {selectedDispute.user?.first_name}{" "}
                    {selectedDispute.user?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Position
                  </Label>
                  <p>
                    {selectedDispute.employment_record?.job_title} @{" "}
                    {selectedDispute.employment_record?.employer?.company_name}
                  </p>
                </div>
              </div>

              {/* AI Suggestion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-accent" />
                    AI Resolution Suggestion
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAISuggestion(selectedDispute)}
                    disabled={aiLoading}
                    className="h-7 text-xs gap-1"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {aiSuggestion ? "Regenerate" : "Get Suggestion"}
                  </Button>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing dispute...
                  </div>
                )}
                {aiSuggestion && (
                  <div className="text-sm bg-accent/5 border border-accent/20 p-3 rounded-lg whitespace-pre-wrap">
                    {aiSuggestion}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add resolution notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleResolve("rejected")}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reject Dispute"
              )}
            </Button>
            <Button
              onClick={() => handleResolve("resolved")}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Resolve in User's Favor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
