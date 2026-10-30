// Pure allow-list (no Deno APIs) so it can be unit-tested.
const EXACT_ORIGINS = new Set([
  "https://globalcareerid.com",
  "https://www.globalcareerid.com",
  "https://globalcareerid.lovable.app",
]);

const PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (EXACT_ORIGINS.has(origin)) return true;
  return PATTERNS.some((p) => p.test(origin));
}

