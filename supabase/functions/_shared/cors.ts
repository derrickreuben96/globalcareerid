// Restricts browser cross-origin access to the app's own domains.
// Imported first by every function; wraps Deno.serve so each response's
// Access-Control-Allow-Origin is set per request, overriding any local "*".

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

export function applyCors(req: Request, res: Response): Response {
  const origin = req.headers.get("Origin");
  const headers = new Headers(res.headers);
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
  } else {
    // Non-browser callers (database triggers, email links) send no Origin and are unaffected.
    headers.delete("Access-Control-Allow-Origin");
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

type Handler = (req: Request, info?: unknown) => Response | Promise<Response>;

const g = globalThis as unknown as { __corsGuardInstalled?: boolean };
if (!g.__corsGuardInstalled) {
  g.__corsGuardInstalled = true;
  const originalServe = Deno.serve.bind(Deno);
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (...args: any[]) => {
    const idx = args.findIndex((a) => typeof a === "function");
    if (idx >= 0) {
      const handler = args[idx] as Handler;
      args[idx] = async (req: Request, info?: unknown) => applyCors(req, await handler(req, info));
    } else if (args[0] && typeof args[0].handler === "function") {
      const handler = args[0].handler as Handler;
      args[0] = { ...args[0], handler: async (req: Request, info?: unknown) => applyCors(req, await handler(req, info)) };
    }
    // deno-lint-ignore no-explicit-any
    return (originalServe as any)(...args);
  };
}
