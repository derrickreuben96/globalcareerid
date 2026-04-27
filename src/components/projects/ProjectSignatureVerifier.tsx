import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, XCircle, FileSignature } from "lucide-react";
import { verifyCredential } from "@/lib/verifyCredential";

interface Props {
  signedJwt: string;
  expectedTitle?: string;
}

type State =
  | { phase: "idle" }
  | { phase: "verifying" }
  | { phase: "valid"; payload: Record<string, unknown> }
  | { phase: "invalid"; reason: string };

export function ProjectSignatureVerifier({ signedJwt, expectedTitle }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [open, setOpen] = useState(false);

  const runVerification = async () => {
    setState({ phase: "verifying" });
    const result = await verifyCredential(signedJwt);
    if (result.valid && result.payload) {
      setState({ phase: "valid", payload: result.payload });
    } else {
      setState({ phase: "invalid", reason: result.reason ?? "Verification failed" });
    }
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
            <div className="flex items-center gap-2">
              <Badge className="bg-verified/10 text-verified gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Signature valid
              </Badge>
            </div>
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
            <Button variant="outline" size="sm" onClick={runVerification}>
              Try again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
