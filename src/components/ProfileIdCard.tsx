import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from './VerifiedBadge';
import { toast } from 'sonner';
import { useRef } from 'react';

interface ProfileIdCardProps {
  profileId: string;
  name: string;
  isVerified?: boolean;
}

export function ProfileIdCard({ profileId, name, isVerified = false }: ProfileIdCardProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const verifyUrl = `${window.location.origin}/verify/${profileId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileId);
    toast.success('Profile ID copied to clipboard');
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `WorkID Profile - ${name}`,
          text: `Verify my professional profile on WorkID`,
          url: verifyUrl,
        });
      } catch (err) {
        // User cancelled or error
        navigator.clipboard.writeText(verifyUrl);
        toast.success('Verification link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(verifyUrl);
      toast.success('Verification link copied to clipboard');
    }
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement('a');
      link.download = `workid-${profileId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code downloaded');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="glass-card rounded-2xl p-6 max-w-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Profile ID</p>
          <p className="profile-id text-foreground">{profileId}</p>
        </div>
        <div 
          ref={qrRef}
          className="w-20 h-20 bg-white rounded-lg p-1.5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={downloadQR}
          title="Click to download QR code"
        >
          <QRCodeSVG
            value={verifyUrl}
            size={68}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="font-medium text-foreground">{name}</p>
        {isVerified && <VerifiedBadge />}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={copyToClipboard}>
          <Copy className="w-4 h-4" />
          Copy ID
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={shareProfile}>
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={downloadQR} title="Download QR">
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
