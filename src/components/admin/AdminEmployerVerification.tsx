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
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Sparkles,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Employer {
  id: string;
  company_name: string;
  registration_number: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
}

interface Props {
  employers: Employer[];
  onRefresh: () => void;
}

export function AdminEmployerVerification({ employers, onRefresh }: Props) {
  const { session } = useAuth();
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [aiAssessment, setAiAssessment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const pendingEmployers = employers.filter(
    (e) => e.verification_status === "pending"
  );
  const reviewedEmployers = employers.filter(
    (e) => e.verification_status !== "pending"
  );

  const handleAIAssessment = async (employer: Employer) => {
    if (!session) return;
    setAiLoading(true);
    setAiAssessment("");
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-ai-assist",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            action: "employer_risk_assessment",
            data: { employer },
          },
        }
      );
      if (error) throw error;
      setAiAssessment(data.result);
    } catch {
      toast.error("Failed to generate AI assessment");
    } finally {
      setAiLoading(false);
    }
  };

  const handleVerify = async (approved: boolean) => {
    if (!selectedEmployer) return;
    setProcessing(true);

    // Get the employer's user_id first for syncing
    const { data: employerRecord } = await supabase
      .from("employers")
      .select("user_id")
      .eq("id", selectedEmployer.id)
      .single();

    const { error } = await supabase
      .from("employers")
      .update({
        is_verified: approved,
        verification_status: approved ? "approved" : "rejected",
        verification_notes: verificationNotes,
      })
      .eq("id", selectedEmployer.id);

    if (error) {
      toast.error("Failed to update employer");
      setProcessing(false);
      return;
    }

    // Sync verification status to organization_profiles if one exists
    if (employerRecord) {
      await supabase
        .from("organization_profiles")
        .update({
          is_verified: approved,
          verification_status: approved ? "approved" : "rejected",
          verification_notes: verificationNotes,
        })
        .eq("user_id", employerRecord.user_id);

      if (approved) {
        await supabase.from("user_roles").upsert({
          user_id: employerRecord.user_id,
          role: "employer" as const,
        });
      }
    }

    // Send verification email on approval
    if (approved) {
      try {
        await supabase.functions.invoke("notify-employer-verified", {
          body: { employer_id: selectedEmployer.id },
        });
      } catch (emailErr) {
        console.warn("Verification email failed to send:", emailErr);
        // Don't block the approval flow if email fails
      }
    }

    toast.success(approved ? "Employer verified" : "Employer rejected");
    setSelectedEmployer(null);
    setVerificationNotes("");
    setAiAssessment("");
    setProcessing(false);
    onRefresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-warning border-warning gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-verified text-verified-foreground gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
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

  const EmployerCard = ({ employer }: { employer: Employer }) => (
    <div className="p-5 border border-border rounded-xl hover:shadow-md transition-all bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">
              {employer.company_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {employer.industry || "No industry"} •{" "}
              {employer.country || "No country"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>Reg: {employer.registration_number || "—"}</span>
              {employer.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="w-3 h-3" />
                  Website
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(employer.verification_status)}
          {employer.verification_status === "pending" && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedEmployer(employer);
                setVerificationNotes("");
                setAiAssessment("");
              }}
            >
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">
          Employer Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          {pendingEmployers.length} pending • {reviewedEmployers.length} reviewed
        </p>
      </div>

      {pendingEmployers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Pending Review ({pendingEmployers.length})
          </h3>
          {pendingEmployers.map((e) => (
            <EmployerCard key={e.id} employer={e} />
          ))}
        </div>
      )}

      {reviewedEmployers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Previously Reviewed
          </h3>
          {reviewedEmployers.map((e) => (
            <EmployerCard key={e.id} employer={e} />
          ))}
        </div>
      )}

      {employers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No employer registrations yet.</p>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog
        open={!!selectedEmployer}
        onOpenChange={() => setSelectedEmployer(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review: {selectedEmployer?.company_name}</DialogTitle>
          </DialogHeader>

          {selectedEmployer && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Company
                  </Label>
                  <p className="font-medium">{selectedEmployer.company_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Registration #
                  </Label>
                  <p>{selectedEmployer.registration_number || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Industry
                  </Label>
                  <p>{selectedEmployer.industry || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Country
                  </Label>
                  <p>{selectedEmployer.country || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p>{selectedEmployer.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Website
                  </Label>
                  <p>
                    {selectedEmployer.website ? (
                      <a
                        href={selectedEmployer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {selectedEmployer.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>

              {/* AI Assessment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-accent" />
                    AI Risk Assessment
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAIAssessment(selectedEmployer)}
                    disabled={aiLoading}
                    className="h-7 text-xs gap-1"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {aiAssessment ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing employer...
                  </div>
                )}
                {aiAssessment && (
                  <div className="text-sm bg-accent/5 border border-accent/20 p-3 rounded-lg whitespace-pre-wrap">
                    {aiAssessment}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Verification Notes</Label>
                <Textarea
                  placeholder="Add notes about this verification decision..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleVerify(false)}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reject"
              )}
            </Button>
            <Button onClick={() => handleVerify(true)} disabled={processing}>
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
