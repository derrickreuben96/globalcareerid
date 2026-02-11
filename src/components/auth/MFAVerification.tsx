import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MFAVerificationProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerification({ isOpen, onSuccess, onCancel }: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleVerify = async () => {
    if (useRecoveryCode) {
      await verifyWithRecoveryCode();
    } else {
      await verifyWithTOTP();
    }
  };

  const verifyWithTOTP = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      // Get the available factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError || !factors.totp.length) {
        toast.error('MFA verification failed');
        return;
      }

      const totpFactor = factors.totp.find(f => f.status === 'verified');
      if (!totpFactor) {
        toast.error('No verified MFA factor found');
        return;
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        toast.error('Failed to create verification challenge');
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error('Invalid code. Please try again.');
        setCode('');
        return;
      }

      toast.success('Verification successful!');
      onSuccess();
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyWithRecoveryCode = async () => {
    const cleanCode = recoveryCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    if (cleanCode.length < 10) {
      toast.error('Please enter a valid recovery code');
      return;
    }

    setIsVerifying(true);
    try {
      // Get the current user to get their ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not found');
        return;
      }

      // Get the MFA factor to unenroll after recovery
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp.find(f => f.status === 'verified');

      // Verify the recovery code via edge function
      const { data, error } = await supabase.functions.invoke('recovery-codes', {
        body: { 
          action: 'verify', 
          code: cleanCode,
          userId: user.id
        }
      });

      if (error) {
        toast.error('Failed to verify recovery code');
        return;
      }

      if (!data?.valid) {
        toast.error('Invalid or already used recovery code');
        setRecoveryCode('');
        return;
      }

      // Recovery code is valid - unenroll MFA so user can log in
      if (totpFactor) {
        await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      }

      toast.success('Recovery code accepted! 2FA has been disabled. Please re-enable it in your settings.');
      onSuccess();
    } finally {
      setIsVerifying(false);
    }
  };

  const resetState = () => {
    setCode('');
    setRecoveryCode('');
    setUseRecoveryCode(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetState();
        onCancel();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {useRecoveryCode ? (
              <Key className="w-5 h-5 text-primary" />
            ) : (
              <Shield className="w-5 h-5 text-primary" />
            )}
            {useRecoveryCode ? 'Enter Recovery Code' : 'Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {useRecoveryCode 
              ? 'Enter one of your recovery codes to access your account. This will disable 2FA.'
              : 'Enter the 6-digit code from your authenticator app to continue.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {useRecoveryCode ? (
            <div className="flex flex-col gap-4">
              <Label>Recovery Code</Label>
              <Input
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="font-mono text-center text-lg tracking-wider"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the code in format XXXXX-XXXXX
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Label>Verification Code</Label>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={isVerifying || (useRecoveryCode ? recoveryCode.length < 10 : code.length !== 6)}
              className="flex-1"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify'
              )}
            </Button>
          </div>
          
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setCode('');
              setRecoveryCode('');
            }}
            className="text-muted-foreground"
          >
            {useRecoveryCode ? 'Use authenticator app instead' : 'Lost your device? Use a recovery code'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
