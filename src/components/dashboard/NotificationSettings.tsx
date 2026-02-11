import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPrefs {
  email_on_record_added: boolean;
  email_on_record_ended: boolean;
  email_on_record_updated: boolean;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) return;

      // Try to fetch existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('email_on_record_added, email_on_record_ended, email_on_record_updated')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
      }

      if (data) {
        setPrefs(data);
      } else {
        // Create default preferences if not exists
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!insertError) {
          setPrefs({
            email_on_record_added: true,
            email_on_record_ended: true,
            email_on_record_updated: true,
          });
        }
      }
      setIsLoading(false);
    };

    fetchPrefs();
  }, [user]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user || !prefs) return;

    setIsSaving(true);
    const updatedPrefs = { ...prefs, [key]: value };
    setPrefs(updatedPrefs);

    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: value })
      .eq('user_id', user.id);

    if (error) {
      // Revert on error
      setPrefs(prefs);
      toast.error('Failed to save preference');
    } else {
      toast.success('Preference saved');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading preferences...
      </div>
    );
  }

  if (!prefs) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Email Notifications</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-xl">
          <div>
            <Label className="text-foreground">New Employment Record</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when an employer adds you as an employee
            </p>
          </div>
          <Switch
            checked={prefs.email_on_record_added}
            onCheckedChange={(value) => updatePref('email_on_record_added', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-xl">
          <div>
            <Label className="text-foreground">Employment Ended</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when an employer ends your employment record
            </p>
          </div>
          <Switch
            checked={prefs.email_on_record_ended}
            onCheckedChange={(value) => updatePref('email_on_record_ended', value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-xl">
          <div>
            <Label className="text-foreground">Record Updates</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when an employer updates your employment details
            </p>
          </div>
          <Switch
            checked={prefs.email_on_record_updated}
            onCheckedChange={(value) => updatePref('email_on_record_updated', value)}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
