import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildVerifyProfileUrl } from "@/lib/shareUrl";

interface Props {
  profileId: string;
  employeeName: string;
  /** Override origin — useful for SSR/tests. Falls back to env or window. */
  origin?: string;
}

export function ShareProfileDialog({ profileId, employeeName, origin }: Props) {
  const verifyUrl = buildVerifyProfileUrl(profileId, origin);

  const copyText = async (text: string, msg: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(msg);
      } else {
        toast.error("Clipboard not available in this environment");
      }
    } catch {
      toast.error("Failed to copy");
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Verified work record — ${employeeName}`,
          text: `Verify ${employeeName}'s work record on Global Career ID`,
          url: verifyUrl,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    copyText(verifyUrl, "Verification link copied");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" /> Share employee record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verified work record</DialogTitle>
          <DialogDescription>
            Open {employeeName}'s full verified profile in a new tab or share the link.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <QRCodeSVG value={verifyUrl} size={180} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#0f172a" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Profile ID</span>
            <code className="text-sm font-mono">{profileId}</code>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(profileId, "Profile ID copied")}
              className="gap-2"
            >
              <Copy className="w-4 h-4" /> Copy ID
            </Button>
            <Button variant="outline" size="sm" onClick={share} className="gap-2">
              <Share2 className="w-4 h-4" /> Share link
            </Button>
          </div>

          <Button asChild size="sm" className="w-full">
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer">
              Open verified profile
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
