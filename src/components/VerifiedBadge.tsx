import { CheckCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  variant?: 'default' | 'large' | 'inline';
  label?: string;
}

export function VerifiedBadge({ variant = 'default', label = 'Verified' }: VerifiedBadgeProps) {
  if (variant === 'large') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-verified/10 text-verified">
        <Shield className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <CheckCircle className="w-4 h-4 text-verified inline-block ml-1" />
    );
  }

  return (
    <span className="verified-badge">
      <CheckCircle className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
