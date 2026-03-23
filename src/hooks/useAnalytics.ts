import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  track as trackEvent,
  identifyUser,
  resetAnalytics,
  initAnalytics,
  type AnalyticsEvent,
} from '@/lib/analytics';
import { setUserContext, clearUserContext } from '@/lib/errorTracking';

/**
 * Hook that provides analytics tracking and auto-identifies the user.
 */
export function useAnalytics() {
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          if (identifiedRef.current === userId) return;
          identifiedRef.current = userId;

          // Init analytics (checks consent)
          await initAnalytics(userId);

          identifyUser(userId, {
            email: session.user.email,
          });
          setUserContext(userId, session.user.email);
        }

        if (event === 'SIGNED_OUT') {
          identifiedRef.current = null;
          resetAnalytics();
          clearUserContext();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const track = useCallback(
    (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
      trackEvent(event, properties);
    },
    []
  );

  return { track };
}
