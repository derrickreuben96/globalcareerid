import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, Briefcase, TrendingUp } from 'lucide-react';
import { useAutoExperienceLevel } from '@/hooks/useAutoExperienceLevel';
import { experienceLevelLabel } from '@/lib/experienceLevel';

export function ProfileVisibilityToggle() {
  const { profile, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const { totalMonths, level: autoLevel, loading: autoLoading } = useAutoExperienceLevel(
    profile?.user_id,
    (profile as any)?.experience_level,
    refreshProfile
  );

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

  // Experience level is auto-calculated from work history — no manual setter.

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

      {/* Experience Level (auto-calculated from work history) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Experience Level
        </Label>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">
              {autoLoading ? 'Calculating…' : experienceLevelLabel(autoLevel)}
            </p>
            <p className="text-xs text-muted-foreground">
              {autoLoading
                ? 'Reading your verified employment history'
                : `Based on ${totalMonths} month${totalMonths === 1 ? '' : 's'} of verified work history`}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">{autoLevel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          This level updates automatically as your verified employment grows.
        </p>
      </div>
    </div>
  );
}
