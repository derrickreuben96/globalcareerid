import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateTotalMonths,
  deriveExperienceLevel,
  type ExperienceLevel,
} from '@/lib/experienceLevel';

/**
 * Computes experience level from the user's verified employment_records and
 * syncs it to profiles.experience_level when it changes.
 * Returns { totalMonths, level, loading }.
 */
export function useAutoExperienceLevel(
  userId: string | undefined,
  currentLevel: string | null | undefined,
  onSynced?: () => void
) {
  const [totalMonths, setTotalMonths] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>('entry');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('employment_records')
        .select('start_date, end_date, status')
        .eq('user_id', userId)
        .in('status', ['active', 'ended']);

      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }

      const months = calculateTotalMonths(data || []);
      const derived = deriveExperienceLevel(months, currentLevel);
      setTotalMonths(months);
      setLevel(derived);
      setLoading(false);

      // Sync to profile if changed (and not preserving executive)
      if (derived !== currentLevel) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ experience_level: derived })
          .eq('user_id', userId);
        if (!updErr && onSynced) onSynced();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, currentLevel]);

  return { totalMonths, level, loading };
}
