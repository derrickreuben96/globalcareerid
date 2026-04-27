import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  profileId: string;
  employeeName: string;
}

export function ShareProfileDialog({ profileId, employeeName }: Props) {
  const verifyUrl = `${window.location.origin}/verify/${profileId}`;

  const copyId = () => {
    navigator.clipboard.writeText(profileId);
    toast.success("Profile ID copied");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    toast.success("Verification link copied");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verified work record — ${employeeName}`,
          text: `Verify ${employeeName}'s work record on Global Career ID`,
          url: verifyUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
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
            <Button variant="outline" size="sm" onClick={copyId} className="gap-2">
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
