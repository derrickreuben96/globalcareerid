import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, Briefcase } from 'lucide-react';

export function ProfileVisibilityToggle() {
  const { profile, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const isPublic = profile?.visibility === 'public';

  const handleVisibilityChange = async (checked: boolean) => {
    if (!profile) return;
    
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ visibility: checked ? 'public' : 'private' })
      .eq('user_id', profile.user_id);

    if (error) {
      toast.error('Failed to update visibility');
      console.error(error);
    } else {
      toast.success(`Profile is now ${checked ? 'public' : 'private'}`);
      refreshProfile();
    }
    setIsUpdating(false);
  };

  const handleAvailabilityChange = async (value: string) => {
    if (!profile) return;
    
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ availability: value })
      .eq('user_id', profile.user_id);

    if (error) {
      toast.error('Failed to update availability');
      console.error(error);
    } else {
      toast.success('Availability updated');
      refreshProfile();
    }
    setIsUpdating(false);
  };

  const handleExperienceChange = async (value: string) => {
    if (!profile) return;
    
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ experience_level: value })
      .eq('user_id', profile.user_id);

    if (error) {
      toast.error('Failed to update experience level');
      console.error(error);
    } else {
      toast.success('Experience level updated');
      refreshProfile();
    }
    setIsUpdating(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          Profile Visibility & Availability
        </h3>
        <p className="text-sm text-muted-foreground">
          Control how employers can discover you in talent searches
        </p>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center gap-3">
          {isPublic ? (
            <Eye className="w-5 h-5 text-primary" />
          ) : (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="visibility" className="text-foreground font-medium">
              Profile Visibility
            </Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? 'Employers can find you in talent searches' : 'Your profile is hidden from searches'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPublic ? 'default' : 'secondary'}>
            {isPublic ? 'Public' : 'Private'}
          </Badge>
          <Switch
            id="visibility"
            checked={isPublic}
            onCheckedChange={handleVisibilityChange}
            disabled={isUpdating}
          />
        </div>
      </div>

      {/* Availability Status */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Job Search Status
        </Label>
        <Select
          value={(profile as any)?.availability || 'not_looking'}
          onValueChange={handleAvailabilityChange}
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_looking">Not Looking</SelectItem>
            <SelectItem value="open_to_offers">Open to Offers</SelectItem>
            <SelectItem value="actively_looking">Actively Looking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <Label>Experience Level</Label>
        <Select
          value={(profile as any)?.experience_level || 'entry'}
          onValueChange={handleExperienceChange}
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
            <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
            <SelectItem value="senior">Senior (6-10 years)</SelectItem>
            <SelectItem value="lead">Lead / Principal (10+ years)</SelectItem>
            <SelectItem value="executive">Executive / C-Level</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
