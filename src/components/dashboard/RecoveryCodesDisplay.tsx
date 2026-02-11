import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Copy, Download, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryCodesDisplayProps {
  codes: string[];
  open: boolean;
  onClose: () => void;
}

export function RecoveryCodesDisplay({ codes, open, onClose }: RecoveryCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    toast.success('Recovery codes copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodes = () => {
    const content = `TrueWork Recovery Codes
Generated: ${new Date().toISOString()}

IMPORTANT: Keep these codes in a safe place. Each code can only be used once.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app, use one of these codes to log in.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'truework-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Recovery codes downloaded');
  };

  const handleClose = () => {
    if (!acknowledged) {
      toast.error('Please confirm you have saved your recovery codes');
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Save Your Recovery Codes
          </DialogTitle>
          <DialogDescription>
            Store these codes somewhere safe. Each code can only be used once to access your account if you lose your authenticator device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {codes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground w-4">{index + 1}.</span>
                <span className="text-foreground">{code}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={downloadCodes}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Important</p>
              <p className="text-muted-foreground">
                These codes will not be shown again. Make sure to save them before closing this dialog.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-foreground">
              I have saved my recovery codes in a safe place
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} disabled={!acknowledged}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
