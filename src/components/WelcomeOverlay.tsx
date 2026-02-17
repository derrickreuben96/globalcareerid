import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface WelcomeOverlayProps {
  name: string;
  logoUrl?: string | null;
  onComplete: () => void;
}

export function WelcomeOverlay({ name, logoUrl, onComplete }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // wait for fade out
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="text-center animate-in fade-in zoom-in duration-500">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Company logo"
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
        )}
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Welcome, {name}
        </h1>
        <p className="text-muted-foreground text-lg">
          to Global Career ID
        </p>
      </div>
    </div>
  );
}