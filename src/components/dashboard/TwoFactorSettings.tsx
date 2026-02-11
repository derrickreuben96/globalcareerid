import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, AlertTriangle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { RecoveryCodesDisplay } from './RecoveryCodesDisplay';

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export function TwoFactorSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  
  // Enrollment state
  const [enrollmentStep, setEnrollmentStep] = useState<'qr' | 'verify'>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  
  // Recovery codes state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodeCount, setRecoveryCodeCount] = useState<number>(0);
  const [isGeneratingRecoveryCodes, setIsGeneratingRecoveryCodes] = useState(false);

  const fetchFactors = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error fetching MFA factors');
        return;
      }
      
      // Filter to only show verified TOTP factors
      const verifiedFactors = data.totp.filter(f => f.status === 'verified');
      setFactors(verifiedFactors);
      
      // Fetch recovery code count if 2FA is enabled
      if (verifiedFactors.length > 0) {
        fetchRecoveryCodeCount();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecoveryCodeCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('recovery-codes', {
        body: { action: 'count' }
      });
      
      if (!error && data) {
        setRecoveryCodeCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching recovery code count:', err);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, [user]);

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) {
        toast.error('Failed to start 2FA enrollment');
        return;
      }

      if (data.totp) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setEnrollmentStep('qr');
        setEnrollDialogOpen(true);
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        toast.error('Failed to create verification challenge');
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) {
        toast.error('Invalid verification code. Please try again.');
        return;
      }

      // Generate recovery codes after successful 2FA enrollment
      await generateRecoveryCodes();
      
      toast.success('Two-factor authentication enabled successfully!');
      setEnrollDialogOpen(false);
      resetEnrollmentState();
      fetchFactors();
    } finally {
      setIsVerifying(false);
    }
  };

  const generateRecoveryCodes = async () => {
    setIsGeneratingRecoveryCodes(true);
    try {
      const { data, error } = await supabase.functions.invoke('recovery-codes', {
        body: { action: 'generate' }
      });

      if (error) {
        toast.error('Failed to generate recovery codes');
        return;
      }

      if (data?.codes) {
        setRecoveryCodes(data.codes);
        setShowRecoveryCodes(true);
        setRecoveryCodeCount(data.codes.length);
      }
    } catch (err) {
      console.error('Error generating recovery codes:', err);
      toast.error('Failed to generate recovery codes');
    } finally {
      setIsGeneratingRecoveryCodes(false);
    }
  };

  const unenrollFactor = async () => {
    if (!selectedFactorId) return;

    setIsUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: selectedFactorId,
      });

      if (error) {
        toast.error('Failed to disable 2FA');
        return;
      }

      toast.success('Two-factor authentication disabled');
      setUnenrollDialogOpen(false);
      setSelectedFactorId(null);
      fetchFactors();
    } finally {
      setIsUnenrolling(false);
    }
  };

  const resetEnrollmentState = () => {
    setEnrollmentStep('qr');
    setQrCode('');
    setSecret('');
    setFactorId('');
    setVerifyCode('');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret key copied to clipboard');
  };

  const is2FAEnabled = factors.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            is2FAEnabled ? 'bg-verified/10' : 'bg-muted'
          }`}>
            {is2FAEnabled ? (
              <ShieldCheck className="w-5 h-5 text-verified" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <Badge variant={is2FAEnabled ? 'default' : 'secondary'} className={is2FAEnabled ? 'bg-verified' : ''}>
          {is2FAEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      {is2FAEnabled ? (
        <div className="space-y-3">
          {factors.map((factor) => (
            <div key={factor.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-verified" />
                <div>
                  <p className="font-medium text-foreground">{factor.friendly_name || 'Authenticator App'}</p>
                  <p className="text-xs text-muted-foreground">TOTP • Active</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFactorId(factor.id);
                  setUnenrollDialogOpen(true);
                }}
              >
                <ShieldOff className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ))}
          
          {/* Recovery Codes Section */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Recovery Codes</p>
                <p className="text-xs text-muted-foreground">
                  {recoveryCodeCount > 0 
                    ? `${recoveryCodeCount} unused codes remaining`
                    : 'No recovery codes generated'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateRecoveryCodes}
              disabled={isGeneratingRecoveryCodes}
            >
              {isGeneratingRecoveryCodes ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Key className="w-4 h-4 mr-1" />
              )}
              {recoveryCodeCount > 0 ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border border-dashed border-border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Protect your account with time-based one-time passwords (TOTP) using an authenticator app like Google Authenticator or Authy.
          </p>
          <Button onClick={startEnrollment} disabled={isEnrolling}>
            {isEnrolling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Enable 2FA
          </Button>
        </div>
      )}

      {/* Recovery Codes Display Dialog */}
      <RecoveryCodesDisplay 
        codes={recoveryCodes} 
        open={showRecoveryCodes} 
        onClose={() => setShowRecoveryCodes(false)} 
      />

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={(open) => {
        if (!open) resetEnrollmentState();
        setEnrollDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              {enrollmentStep === 'qr' 
                ? 'Scan the QR code with your authenticator app'
                : 'Enter the verification code from your app'
              }
            </DialogDescription>
          </DialogHeader>

          {enrollmentStep === 'qr' ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG value={qrCode} size={180} />
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Can't scan? Enter this secret key manually:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-1 bg-muted rounded text-sm font-mono">
                    {secret}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setEnrollmentStep('verify')}>
                  Continue
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <Label>Enter the 6-digit code from your authenticator app</Label>
                <InputOTP
                  maxLength={6}
                  value={verifyCode}
                  onChange={setVerifyCode}
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setEnrollmentStep('qr')}>
                  Back
                </Button>
                <Button onClick={verifyEnrollment} disabled={isVerifying || verifyCode.length !== 6}>
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <Dialog open={unenrollDialogOpen} onOpenChange={setUnenrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnenrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={unenrollFactor} disabled={isUnenrolling}>
              {isUnenrolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
