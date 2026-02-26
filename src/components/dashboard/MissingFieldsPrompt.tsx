import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, CreditCard, Globe } from 'lucide-react';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { countries } from '@/lib/countries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MissingFieldsPromptProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profile: {
    national_id: string | null;
    passport_number: string | null;
    phone: string | null;
    country: string | null;
    citizenship: string | null;
  };
  onUpdate: () => Promise<void>;
}

export function MissingFieldsPrompt({ isOpen, onClose, userId, profile, onUpdate }: MissingFieldsPromptProps) {
  const [nationalId, setNationalId] = useState(profile.national_id || '');
  const [passportNumber, setPassportNumber] = useState(profile.passport_number || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [country, setCountry] = useState(profile.country || '');
  const [citizenship, setCitizenship] = useState(profile.citizenship || '');
  const [isSaving, setIsSaving] = useState(false);

  const missingFields: string[] = [];
  if (!profile.national_id) missingFields.push('National ID');
  if (!profile.phone) missingFields.push('Phone');
  if (!profile.country) missingFields.push('Country');
  if (!profile.citizenship) missingFields.push('Citizenship');

  const handleSave = async () => {
    if (!nationalId.trim()) {
      toast.error('National ID is required');
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {
        national_id: nationalId.trim(),
        passport_number: passportNumber.trim() || null,
        profile_complete: true,
      };
      if (!profile.phone && phone.trim()) updates.phone = phone.trim();
      if (!profile.country && country.trim()) updates.country = country.trim();
      if (!profile.citizenship && citizenship.trim()) updates.citizenship = citizenship.trim();

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        if (error.message.includes('idx_profiles_national_id')) {
          toast.error('This National ID is already registered. Please contact support if this is an error.');
        } else {
          toast.error('Failed to update profile: ' + error.message);
        }
        return;
      }

      toast.success('Profile updated successfully!');
      await onUpdate();
      onClose();
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Complete Your Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Please provide the following mandatory information to complete your profile verification.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {missingFields.map(f => (
              <Badge key={f} variant="outline" className="text-warning border-warning/50">
                {f} missing
              </Badge>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nationalId" className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                National ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nationalId"
                placeholder="Enter your National ID number"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className={!profile.national_id ? 'border-warning/50 bg-warning/5' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passportNumber">Passport Number (optional)</Label>
              <Input
                id="passportNumber"
                placeholder="Enter passport number"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
              />
            </div>

            {!profile.phone && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="border-warning/50">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-warning/50 bg-warning/5"
                />
              </div>
            )}

            {!profile.country && (
              <div className="space-y-1.5">
                <Label>Country of Residence</Label>
                <AutocompleteInput
                  suggestions={countries}
                  placeholder="Start typing..."
                  value={country}
                  onValueChange={setCountry}
                  icon={<Globe className="w-4 h-4" />}
                />
              </div>
            )}

            {!profile.citizenship && (
              <div className="space-y-1.5">
                <Label>Citizenship</Label>
                <AutocompleteInput
                  suggestions={countries}
                  placeholder="Start typing..."
                  value={citizenship}
                  onValueChange={setCitizenship}
                  icon={<Globe className="w-4 h-4" />}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save & Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
