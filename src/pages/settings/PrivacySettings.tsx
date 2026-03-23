import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getConsentStatus, exportDataAsJSON, exportDataAsPDF } from '@/lib/gdpr';
import { toast } from 'sonner';
import {
  Download,
  FileJson,
  FileText,
  Shield,
  Trash2,
  Loader2,
  XCircle,
  Database,
  CheckCircle,
} from 'lucide-react';

const CONSENT_TYPES = [
  { key: 'marketing', label: 'Marketing Emails', description: 'Receive product updates and promotional content' },
  { key: 'analytics', label: 'Analytics Tracking', description: 'Help us improve by sharing usage analytics' },
  { key: 'data_processing', label: 'Data Processing for Verification', description: 'Allow processing your data for employment verification' },
] as const;

export default function PrivacySettings() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [consentLoading, setConsentLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'ready'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportRequestId, setExportRequestId] = useState<string | null>(null);
  const [dataCounts, setDataCounts] = useState({ employment: 0, credentials: 0, workHistory: 0 });
  const [pendingDeletion, setPendingDeletion] = useState<{ id: string; scheduled_for: string } | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load consent status and data counts
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Consent status
      const status = await getConsentStatus(user.id);
      setConsents(status);
      setConsentLoading(false);

      // Data counts
      const [empRes, credRes, whRes] = await Promise.all([
        supabase.from('employment_records').select('id', { count: 'exact', head: true }),
        supabase.from('credentials' as any).select('id', { count: 'exact', head: true }),
        supabase.from('work_history').select('id', { count: 'exact', head: true }),
      ]);
      setDataCounts({
        employment: empRes.count || 0,
        credentials: credRes.count || 0,
        workHistory: whRes.count || 0,
      });

      // Check for pending deletion
      const { data: deletionData } = await supabase
        .from('deletion_requests' as any)
        .select('id, scheduled_for')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deletionData) {
        setPendingDeletion(deletionData as any);
      }
    };

    loadData();
  }, [user]);

  // Poll for export readiness
  useEffect(() => {
    if (exportStatus !== 'preparing' || !exportRequestId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('data_export_requests' as any)
        .select('status, download_url')
        .eq('id', exportRequestId)
        .maybeSingle();

      if (data && (data as any).status === 'ready') {
        setExportStatus('ready');
        setDownloadUrl((data as any).download_url);
        clearInterval(interval);
        toast.success('Your data export is ready for download!');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [exportStatus, exportRequestId]);

  const handleExport = async () => {
    if (!user) return;

    setExportStatus('preparing');
    toast.info('Your export is being prepared, you\'ll be notified when ready.');

    // Insert export request
    const { data, error } = await supabase
      .from('data_export_requests' as any)
      .insert({ user_id: user.id } as any)
      .select('id')
      .single();

    if (error) {
      toast.error('Failed to request export');
      setExportStatus('idle');
      return;
    }

    const requestId = (data as any).id;
    setExportRequestId(requestId);

    // Trigger the edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/export-user-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ exportRequestId: requestId }),
    }).catch(() => {
      // The edge function runs async, polling handles the result
    });
  };

  const handleConsentToggle = async (type: string, granted: boolean) => {
    if (!user) return;

    setConsents(prev => ({ ...prev, [type]: granted }));

    const { error } = await supabase
      .from('consent_log' as any)
      .insert({
        user_id: user.id,
        consent_type: type,
        granted,
        user_agent: navigator.userAgent,
      } as any);

    if (error) {
      // Revert
      setConsents(prev => ({ ...prev, [type]: !granted }));
      toast.error('Failed to update consent');
    } else {
      toast.success(`${granted ? 'Granted' : 'Revoked'} consent for ${type.replace('_', ' ')}`);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;
    setDeletionLoading(true);

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('deletion_requests' as any)
      .insert({
        user_id: user.id,
        reason: 'User requested account deletion',
        scheduled_for: scheduledFor,
      } as any)
      .select('id, scheduled_for')
      .single();

    setDeletionLoading(false);

    if (error) {
      toast.error('Failed to submit deletion request');
    } else {
      setPendingDeletion(data as any);
      toast.success('Account deletion scheduled. You have 30 days to cancel.');
    }
  };

  const handleCancelDeletion = async () => {
    if (!pendingDeletion) return;
    setDeletionLoading(true);

    const { error } = await supabase
      .from('deletion_requests' as any)
      .update({ status: 'cancelled' } as any)
      .eq('id', pendingDeletion.id);

    setDeletionLoading(false);

    if (error) {
      toast.error('Failed to cancel deletion request');
    } else {
      setPendingDeletion(null);
      toast.success('Account deletion cancelled.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Privacy & Data Settings</h1>
              <p className="text-muted-foreground">Manage your data, consent preferences, and account</p>
            </div>
          </div>

          {/* Section A: Your Data */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Your Data
              </CardTitle>
              <CardDescription>Download or export all data we store about you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{dataCounts.employment}</p>
                  <p className="text-xs text-muted-foreground">Employment Records</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{dataCounts.credentials}</p>
                  <p className="text-xs text-muted-foreground">Credentials</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{dataCounts.workHistory}</p>
                  <p className="text-xs text-muted-foreground">Work History</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                {exportStatus === 'idle' && (
                  <Button onClick={handleExport} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download My Data
                  </Button>
                )}
                {exportStatus === 'preparing' && (
                  <Button disabled className="gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing Export…
                  </Button>
                )}
                {exportStatus === 'ready' && downloadUrl && (
                  <div className="flex gap-2">
                    <Button asChild className="gap-2">
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <FileJson className="w-4 h-4" />
                        Download JSON
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section B: Consent Management */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Consent Management
              </CardTitle>
              <CardDescription>Control how your data is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {consentLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                CONSENT_TYPES.map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={key} className="text-sm font-medium">{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      id={key}
                      checked={consents[key] ?? false}
                      onCheckedChange={(checked) => handleConsentToggle(key, checked)}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section C: Account Deletion */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Account Deletion
              </CardTitle>
              <CardDescription>Permanently delete your account and all associated data</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDeletion ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <p className="text-sm text-destructive font-medium">
                      Account deletion is scheduled for{' '}
                      {new Date(pendingDeletion.scheduled_for).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All your data will be permanently removed after this date.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCancelDeletion}
                    disabled={deletionLoading}
                    className="gap-2"
                  >
                    {deletionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Cancel Deletion Request
                  </Button>
                </div>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Request Account Deletion
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This action will schedule your account for permanent deletion in 30 days.
                          During this period, you can cancel the request.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                          <li>All your profile data will be permanently deleted</li>
                          <li>All employment records will be removed</li>
                          <li>All credentials will be revoked</li>
                          <li>This action cannot be undone after the 30-day period</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRequestDeletion}
                        disabled={deletionLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Yes, Delete My Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
