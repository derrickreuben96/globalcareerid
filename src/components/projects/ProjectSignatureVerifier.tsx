import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, XCircle, FileSignature, Copy, Download, ShieldAlert, ShieldOff } from "lucide-react";
import { verifyCredential } from "@/lib/verifyCredential";
import { copyToClipboard } from "@/lib/clipboard";
import { useRevocationStatus } from "@/hooks/useRevocationStatus";
import { toast } from "sonner";

interface Props {
  signedJwt: string;
  expectedTitle?: string;
  /** Optional context shown in the downloadable report. */
  projectTitle?: string;
  projectId?: string;
}

type State =
  | { phase: "idle" }
  | { phase: "verifying" }
  | { phase: "valid"; payload: Record<string, unknown> }
  | { phase: "invalid"; reason: string };

export function ProjectSignatureVerifier({ signedJwt, expectedTitle, projectTitle, projectId }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [open, setOpen] = useState(false);
  const revocation = useRevocationStatus(signedJwt, open);

  const runVerification = async () => {
    setState({ phase: "verifying" });
    const result = await verifyCredential(signedJwt);
    if (result.valid && result.payload) {
      setState({ phase: "valid", payload: result.payload });
    } else {
      setState({ phase: "invalid", reason: result.reason ?? "Verification failed" });
    }
  };

  const copyJwt = async () => {
    const ok = await copyToClipboard(signedJwt);
    if (ok) toast.success("Signed JWT copied to clipboard");
    else toast.error("Failed to copy JWT");
  };

  const downloadReport = () => {
    if (state.phase !== "valid") return;
    const titleMatches =
      !expectedTitle ||
      (typeof state.payload.title === "string" && state.payload.title === expectedTitle);

    const report = {
      report: "Global Career ID — Verification Report",
      generated_at: new Date().toISOString(),
      project: {
        id: projectId,
        title: projectTitle,
      },
      verification: {
        algorithm: "ES256",
        issuer: "globalcareerid",
        signature_valid: true,
        revoked: revocation.phase === "revoked",
        revoked_at: revocation.phase === "revoked" ? revocation.at ?? null : null,
        title_matches_signed_payload: titleMatches,
      },
      signed_payload: state.payload,
      signed_jwt: signedJwt,
      instructions:
        "To independently verify, fetch the platform's public key at /functions/v1/get-public-key and validate signed_jwt with any ES256/JWT library (issuer=globalcareerid).",
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (projectTitle ?? "verification").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40);
    a.href = url;
    a.download = `${safeTitle}_verification_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Verification report downloaded");
  };

  const reasonLabels: Record<string, string> = {
    revoked: "This record has been revoked",
    expired: "This record has expired",
    invalid_signature: "Invalid signature — record may be tampered",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && state.phase === "idle") runVerification();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSignature className="w-4 h-4" /> Verify signature
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cryptographic verification</DialogTitle>
          <DialogDescription>
            ES256 signature check against the platform's public key.
          </DialogDescription>
        </DialogHeader>

        {state.phase === "verifying" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying signature…</p>
          </div>
        )}

        {state.phase === "valid" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-verified/10 text-verified gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Signature valid
              </Badge>

              {revocation.phase === "checking" && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking revocation…
                </Badge>
              )}
              {revocation.phase === "active" && (
                <Badge className="bg-verified/10 text-verified gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Not revoked
                </Badge>
              )}
              {revocation.phase === "revoked" && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldOff className="w-3.5 h-3.5" /> Revoked
                </Badge>
              )}
              {revocation.phase === "error" && (
                <Badge variant="secondary" className="gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Status unknown
                </Badge>
              )}
            </div>

            {revocation.phase === "revoked" && (
              <Alert variant="destructive">
                <ShieldOff className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  This signed record has been revoked or superseded by the issuer.
                  {revocation.at && (
                    <> Revoked at {new Date(revocation.at).toLocaleString()}.</>
                  )}{" "}
                  Treat the displayed information as no longer authoritative.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-xs">
              {Object.entries(state.payload)
                .filter(([k]) => !["iat", "exp", "iss"].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono text-right break-all">
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
            </div>
            {expectedTitle &&
              typeof state.payload.title === "string" &&
              state.payload.title !== expectedTitle && (
                <p className="text-xs text-destructive">
                  Warning: signed title does not match displayed title.
                </p>
              )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={copyJwt} className="gap-2">
                <Copy className="w-4 h-4" /> Copy signed JWT
              </Button>
              <Button variant="outline" size="sm" onClick={downloadReport} className="gap-2">
                <Download className="w-4 h-4" /> Download report
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Issued by Global Career ID · ES256
            </p>
          </div>
        )}

        {state.phase === "invalid" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <p className="font-medium">Verification failed</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {reasonLabels[state.reason] ?? state.reason}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runVerification}>
                Try again
              </Button>
              <Button variant="ghost" size="sm" onClick={copyJwt} className="gap-2">
                <Copy className="w-4 h-4" /> Copy raw JWT
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
