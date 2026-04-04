import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/countries';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Pencil, MapPin, Globe } from 'lucide-react';
import { nameSchema, phoneSchema, validateField } from '@/lib/validation';

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  country: string | null;
  citizenship: string | null;
  national_id: string | null;
  passport_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  availability: string | null;
  experience_level: string | null;
}

interface ProfileEditorProps {
  userId: string;
  profile: ProfileData;
  onUpdate: () => Promise<void>;
}

function formatGenderLabel(gender: string): string {
  switch (gender) {
    case 'prefer_not_to_say': return 'Prefer not to say';
    case 'non_binary': return 'Non-binary';
    default: return gender.charAt(0).toUpperCase() + gender.slice(1);
  }
}

export function ProfileEditor({ userId, profile, onUpdate }: ProfileEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone || '',
    location: profile.location || '',
    bio: profile.bio || '',
    country: profile.country || '',
    citizenship: profile.citizenship || '',
    national_id: profile.national_id || '',
    passport_number: profile.passport_number || '',
    gender: profile.gender || '',
    date_of_birth: profile.date_of_birth || '',
    availability: profile.availability || 'not_looking',
    experience_level: profile.experience_level || 'entry',
  });

  const handleOpen = () => {
    setForm({
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
      country: profile.country || '',
      citizenship: profile.citizenship || '',
      national_id: profile.national_id || '',
      passport_number: profile.passport_number || '',
      gender: profile.gender || '',
      date_of_birth: profile.date_of_birth || '',
      availability: profile.availability || 'not_looking',
      experience_level: profile.experience_level || 'entry',
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    const firstNameValid = validateField(nameSchema, form.first_name);
    if (!firstNameValid.success) {
      toast.error(`First name: ${firstNameValid.error}`);
      return;
    }
    const lastNameValid = validateField(nameSchema, form.last_name);
    if (!lastNameValid.success) {
      toast.error(`Last name: ${lastNameValid.error}`);
      return;
    }
    if (form.phone) {
      const phoneValid = validateField(phoneSchema, form.phone);
      if (!phoneValid.success) {
        toast.error(`Phone: ${phoneValid.error}`);
        return;
      }
    }

    if (!form.national_id.trim()) {
      toast.error('National ID is required');
      return;
    }

    setIsSaving(true);

    const updates: Record<string, any> = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      location: form.location.trim() || null,
      bio: form.bio.trim() || null,
      country: form.country.trim() || null,
      citizenship: form.citizenship.trim() || null,
      national_id: form.national_id.trim(),
      passport_number: form.passport_number.trim() || null,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      availability: form.availability || 'not_looking',
      experience_level: form.experience_level || 'entry',
    };

    // Mark profile complete if all mandatory fields are present
    if (updates.national_id && updates.gender && updates.date_of_birth) {
      updates.profile_complete = true;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      if (error.message.includes('idx_profiles_national_id')) {
        toast.error('This National ID is already registered. Please contact support.');
      } else {
        toast.error('Failed to update profile');
      }
    } else {
      toast.success('Profile updated');
      await onUpdate();
      setIsOpen(false);
    }
    setIsSaving(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
        <Pencil className="w-4 h-4" />
        Edit Profile
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>National ID <span className="text-destructive">*</span></Label>
              <Input
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                placeholder="Enter your National ID number"
              />
            </div>

            <div className="space-y-2">
              <Label>Passport Number</Label>
              <Input
                value={form.passport_number}
                onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
                placeholder="Enter passport number (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Nairobi, Kenya"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <AutocompleteInput
                  suggestions={countries}
                  value={form.country}
                  onValueChange={(v) => setForm({ ...form, country: v })}
                  icon={<MapPin className="w-4 h-4" />}
                  placeholder="Select country"
                />
              </div>
              <div className="space-y-2">
                <Label>Citizenship</Label>
                <AutocompleteInput
                  suggestions={countries}
                  value={form.citizenship}
                  onValueChange={(v) => setForm({ ...form, citizenship: v })}
                  icon={<Globe className="w-4 h-4" />}
                  placeholder="Select citizenship"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_looking">Not Looking</SelectItem>
                    <SelectItem value="open">Open to Opportunities</SelectItem>
                    <SelectItem value="actively_looking">Actively Looking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="lead">Lead / Principal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{form.bio.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
