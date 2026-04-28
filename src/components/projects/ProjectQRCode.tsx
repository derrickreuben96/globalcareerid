import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { buildPublicProjectUrl } from "@/lib/shareUrl";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  projectId: string;
  projectTitle: string;
  origin?: string;
}

export function ProjectQRCode({ projectId, projectTitle, origin }: Props) {
  const url = buildPublicProjectUrl(projectId, origin);
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) toast.success("Project link copied");
    else toast.error("Failed to copy link");
  };

  const handleDownload = () => {
    if (typeof document === "undefined") return;
    const svg = document.getElementById(`project-qr-${projectId}`) as unknown as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = projectTitle.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || "project";
    a.href = objectUrl;
    a.download = `${safe}_qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    toast.success("QR code downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" /> Scan project QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan to open this record</DialogTitle>
          <DialogDescription>
            Recruiters can scan this code to instantly open the verified project page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <QRCodeSVG
              id={`project-qr-${projectId}`}
              value={url}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs font-mono break-all">
            {url}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              <Copy className="w-4 h-4" /> Copy link
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" /> Download SVG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
