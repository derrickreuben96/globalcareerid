import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent =
  | 'profile_created'
  | 'credential_issued'
  | 'credential_verified'
  | 'credential_revoked'
  | 'employer_onboarded'
  | 'verification_requested'
  | 'verification_approved'
  | 'verification_rejected'
  | 'data_exported'
  | 'deletion_requested'
  | 'qr_scanned'
  | 'pdf_downloaded';

let initialized = false;

/**
 * Initialize PostHog only if analytics consent is granted.
 */
export async function initAnalytics(userId?: string): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key || !host || initialized) return;

  // Respect consent: check if user has granted analytics consent
  if (userId) {
    const { data } = await supabase
      .from('consent_log' as any)
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'analytics')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !(data as any).granted) {
      return; // User explicitly denied analytics
    }
  }

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    loaded: () => {
      initialized = true;
    },
  });

  initialized = true;
}

/**
 * Track a typed analytics event.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/**
 * Identify a user in PostHog.
 */
export function identifyUser(userId: string, traits: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

/**
 * Reset analytics state on logout.
 */
export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}
