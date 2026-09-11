import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BOT_PATTERN =
  /bot|crawl|spider|slurp|gptbot|oai-searchbot|chatgpt|perplexity|claudebot|anthropic|google-extended|bingpreview|applebot|ccbot|bytespider|facebookexternalhit|semrush|ahrefs/i;

const SESSION_KEY = 'gcid_visit_session';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

/**
 * Records one visit per mount for the given path. Used on the AI answer pages
 * and the employer demo page so the admin console can show which of them are
 * actually being crawled and clicked.
 */
export function usePageVisit(path: string) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || typeof window === 'undefined') return;
    sent.current = true;

    const ua = navigator.userAgent || '';
    supabase
      .from('page_visits')
      .insert({
        path,
        referrer: document.referrer ? document.referrer.slice(0, 500) : null,
        user_agent: ua.slice(0, 500),
        is_bot: BOT_PATTERN.test(ua),
        session_id: sessionId(),
      })
      .then(() => undefined, () => undefined);
  }, [path]);
}
