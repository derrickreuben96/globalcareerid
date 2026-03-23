import * as Sentry from '@sentry/react';

let initialized = false;

/**
 * Initialize Sentry error tracking.
 */
export function initErrorTracking(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  initialized = true;
}

/**
 * Capture an error with optional context.
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) {
    console.error(error, context);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Associate errors with a specific user.
 */
export function setUserContext(userId: string, email?: string): void {
  if (!initialized) return;
  Sentry.setUser({ id: userId, ...(email && { email }) });
}

/**
 * Clear user context on logout.
 */
export function clearUserContext(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}
