import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Cookie, Settings2 } from 'lucide-react';

const CONSENT_TYPES = [
  { key: 'marketing', label: 'Marketing', description: 'Product updates and promotional emails' },
  { key: 'analytics', label: 'Analytics', description: 'Usage analytics to improve the platform' },
  { key: 'data_processing', label: 'Data Processing', description: 'Processing data for verification services' },
] as const;

export function CookieConsent() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    marketing: false,
    analytics: false,
    data_processing: false,
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Check if user has any consent records
    const checkConsent = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('consent_log' as any)
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!error && (!data || data.length === 0)) {
          setVisible(true);
        }
      } else {
        // For anonymous users, check localStorage as a fallback
        const dismissed = localStorage.getItem('gcid_cookie_consent_dismissed');
        if (!dismissed) {
          setVisible(true);
        }
      }
    };

    // Small delay so it doesn't flash on page load
    const timer = setTimeout(checkConsent, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const writeConsent = async (consents: Record<string, boolean>) => {
    const entries = Object.entries(consents);

    for (const [type, granted] of entries) {
      await supabase
        .from('consent_log' as any)
        .insert({
          user_id: user?.id ?? null,
          consent_type: type,
          granted,
          user_agent: navigator.userAgent,
        } as any);
    }
  };

  const handleAcceptAll = async () => {
    const allGranted = { marketing: true, analytics: true, data_processing: true };
    await writeConsent(allGranted);
    localStorage.setItem('gcid_cookie_consent_dismissed', 'true');
    setVisible(false);
  };

  const handleRejectAll = async () => {
    const allRejected = { marketing: false, analytics: false, data_processing: false };
    await writeConsent(allRejected);
    localStorage.setItem('gcid_cookie_consent_dismissed', 'true');
    setVisible(false);
  };

  const handleSavePreferences = async () => {
    await writeConsent(preferences);
    localStorage.setItem('gcid_cookie_consent_dismissed', 'true');
    setSheetOpen(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
      <Card className="mx-auto max-w-2xl shadow-lg border-border/80 bg-card/95 backdrop-blur-sm">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-5 h-5 mt-0.5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              We use cookies and similar technologies to improve your experience. You can manage your preferences anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={handleRejectAll}>
              Reject All
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Manage
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Cookie Preferences</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {CONSENT_TYPES.map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label htmlFor={`cookie-${key}`} className="text-sm font-medium">
                          {label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        id={`cookie-${key}`}
                        checked={preferences[key] ?? false}
                        onCheckedChange={(checked) =>
                          setPreferences(prev => ({ ...prev, [key]: checked }))
                        }
                      />
                    </div>
                  ))}
                  <Button onClick={handleSavePreferences} className="w-full mt-4">
                    Save Preferences
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button size="sm" onClick={handleAcceptAll}>
              Accept All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
