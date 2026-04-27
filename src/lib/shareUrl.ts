/**
 * Server-safe share / verification URL builder.
 *
 * Resolution order:
 * 1. Explicit `origin` argument (handy for tests / SSR / edge functions)
 * 2. `VITE_PUBLIC_SITE_URL` env var (build-time)
 * 3. `window.location.origin` (client only)
 * 4. Fallback to `https://globalcareerid.app`
 *
 * Never throws — safe to import in any context.
 */

const FALLBACK_ORIGIN = "https://globalcareerid.app";

export function getSiteOrigin(explicitOrigin?: string): string {
  if (explicitOrigin && /^https?:\/\//.test(explicitOrigin)) {
    return stripTrailingSlash(explicitOrigin);
  }

  // Vite/build-time env (works in SSR & tests via vitest define)
  const envOrigin =
    typeof import.meta !== "undefined"
      ? (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
          ?.VITE_PUBLIC_SITE_URL
      : undefined;
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    return stripTrailingSlash(envOrigin);
  }

  // Browser only — guarded for SSR / Node test runners.
  if (typeof window !== "undefined" && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return FALLBACK_ORIGIN;
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

export function buildVerifyProfileUrl(profileId: string, origin?: string): string {
  return `${getSiteOrigin(origin)}/verify/${encodeURIComponent(profileId)}`;
}

export function buildPublicProjectUrl(projectId: string, origin?: string): string {
  return `${getSiteOrigin(origin)}/project/${encodeURIComponent(projectId)}`;
}
