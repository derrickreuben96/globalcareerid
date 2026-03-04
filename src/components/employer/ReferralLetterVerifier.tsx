import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationResult {
  is_valid: boolean;
  company_name: string;
  employee_name: string;
  job_title: string;
  issued_date: string;
}

export function ReferralLetterVerifier() {
  const [verificationNumber, setVerificationNumber] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const num = verificationNumber.trim();
    if (!num) {
      toast.error('Please enter a verification number');
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const { data, error } = await supabase.rpc('verify_referral_letter', {
        verification_num: num,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setResult(data[0] as VerificationResult);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      console.error(e);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-xl font-display font-semibold text-foreground mb-2 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        Verify Referral Letter
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Enter the verification number from a referral letter to check its authenticity.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Label htmlFor="verify-num" className="sr-only">Verification Number</Label>
          <Input
            id="verify-num"
            placeholder="e.g. RL-2026-A1B2C3D4"
            value={verificationNumber}
            onChange={(e) => setVerificationNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="font-mono"
          />
        </div>
        <Button onClick={handleVerify} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-1" />
          )}
          Verify
        </Button>
      </div>

      {result && (
        <div className="border border-verified/30 bg-verified/5 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-verified" />
            <Badge variant="outline" className="border-verified text-verified font-semibold">
              VALID — AUTHENTIC
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Company</p>
              <p className="font-medium text-foreground">{result.company_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Employee</p>
              <p className="font-medium text-foreground">{result.employee_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Position</p>
              <p className="font-medium text-foreground">{result.job_title}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Issued</p>
              <p className="font-medium text-foreground">
                {new Date(result.issued_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {notFound && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 flex items-center gap-3">
          <ShieldX className="w-6 h-6 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Not Found</p>
            <p className="text-sm text-muted-foreground">
              No referral letter matches this verification number. The document may be fake or the number was entered incorrectly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
