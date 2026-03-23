import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, XCircle, Loader2, Briefcase, Calendar, User } from 'lucide-react';
import { verifyCredential } from '@/lib/verifyCredential';

interface CredentialPayload {
  profileId?: string;
  employerId?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  iat?: number;
  exp?: number;
}

export default function VerifyCredential() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [payload, setPayload] = useState<CredentialPayload | null>(null);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setReason('No credential token provided');
      return;
    }

    verifyCredential(token).then((result) => {
      if (result.valid && result.payload) {
        setPayload(result.payload as CredentialPayload);
        setStatus('valid');
      } else {
        setReason(result.reason || 'Verification failed');
        setStatus('invalid');
      }
    });
  }, [token]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Present';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const reasonLabels: Record<string, string> = {
    revoked: 'This credential has been revoked',
    expired: 'This credential has expired',
    invalid_signature: 'Invalid signature — this credential may be tampered',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Verifying credential…</p>
            </CardContent>
          </Card>
        )}

        {status === 'valid' && payload && (
          <Card className="border-2 border-green-500/30 shadow-lg shadow-green-500/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <Shield className="h-7 w-7 text-green-600" />
              </div>
              <CardTitle className="text-xl">Credential Verified</CardTitle>
              <Badge className="mx-auto mt-2 bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20">
                Cryptographically Signed
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Profile ID</p>
                    <p className="font-mono text-sm font-medium text-foreground">
                      {payload.profileId}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Role</p>
                    <p className="text-sm font-medium text-foreground">{payload.role}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Period</p>
                    <p className="text-sm text-foreground">
                      {formatDate(payload.startDate)} — {formatDate(payload.endDate)}
                    </p>
                  </div>
                </div>
              </div>
              {payload.iat && (
                <p className="text-center text-xs text-muted-foreground">
                  Issued {formatDate(new Date(payload.iat * 1000).toISOString())}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {status === 'invalid' && (
          <Card className="border-2 border-destructive/30 shadow-lg shadow-destructive/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                {reasonLabels[reason] || reason}
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Global Career ID · ES256 Cryptographic Verification
        </p>
      </div>
    </div>
  );
}
