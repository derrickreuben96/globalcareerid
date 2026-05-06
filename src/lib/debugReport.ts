// Lightweight in-memory capture of console errors and network requests
// for the "Send debug report" button.

export interface CapturedConsoleEntry {
  level: 'error' | 'warn';
  timestamp: string;
  message: string;
  stack?: string;
}

export interface CapturedNetworkEntry {
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  type: 'fetch' | 'xhr';
  error?: string;
}

const MAX_ENTRIES = 100;
const consoleBuffer: CapturedConsoleEntry[] = [];
const networkBuffer: CapturedNetworkEntry[] = [];
let installed = false;

function push<T>(buf: T[], entry: T) {
  buf.push(entry);
  if (buf.length > MAX_ENTRIES) buf.shift();
}

function stringifyArg(a: unknown): string {
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  if (typeof a === 'string') return a;
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

export function installDebugCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // --- Console patching ---
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    push(consoleBuffer, {
      level: 'error',
      timestamp: new Date().toISOString(),
      message: args.map(stringifyArg).join(' '),
      stack: args.find((a) => a instanceof Error) instanceof Error
        ? (args.find((a) => a instanceof Error) as Error).stack
        : undefined,
    });
    origError(...args);
  };

  console.warn = (...args: unknown[]) => {
    push(consoleBuffer, {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: args.map(stringifyArg).join(' '),
    });
    origWarn(...args);
  };

  window.addEventListener('error', (e) => {
    push(consoleBuffer, {
      level: 'error',
      timestamp: new Date().toISOString(),
      message: e.message,
      stack: e.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    push(consoleBuffer, {
      level: 'error',
      timestamp: new Date().toISOString(),
      message: `Unhandled promise rejection: ${stringifyArg(e.reason)}`,
      stack: e.reason instanceof Error ? e.reason.stack : undefined,
    });
  });

  // --- Fetch patching ---
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    try {
      const res = await origFetch(input as RequestInfo, init);
      push(networkBuffer, {
        timestamp: new Date().toISOString(),
        method,
        url,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        type: 'fetch',
      });
      return res;
    } catch (err) {
      push(networkBuffer, {
        timestamp: new Date().toISOString(),
        method,
        url,
        durationMs: Math.round(performance.now() - start),
        type: 'fetch',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };

  // --- XHR patching ---
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR(this: XMLHttpRequest) {
    const xhr = new OrigXHR();
    let method = 'GET';
    let url = '';
    let start = 0;
    const origOpen = xhr.open;
    xhr.open = function (m: string, u: string | URL, ...rest: unknown[]) {
      method = m.toUpperCase();
      url = typeof u === 'string' ? u : u.toString();
      return (origOpen as any).call(this, m, u, ...rest);
    };
    const origSend = xhr.send;
    xhr.send = function (...args: unknown[]) {
      start = performance.now();
      xhr.addEventListener('loadend', () => {
        push(networkBuffer, {
          timestamp: new Date().toISOString(),
          method,
          url,
          status: xhr.status,
          durationMs: Math.round(performance.now() - start),
          type: 'xhr',
        });
      });
      return (origSend as any).apply(this, args);
    };
    return xhr;
  }
  // @ts-expect-error - replace constructor
  window.XMLHttpRequest = PatchedXHR;
}

export function buildDebugReport(extra?: Record<string, unknown>) {
  return {
    generatedAt: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport:
      typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : null,
    consoleErrors: [...consoleBuffer],
    networkRequests: [...networkBuffer],
    ...(extra ? { extra } : {}),
  };
}

export function downloadDebugReport(extra?: Record<string, unknown>) {
  const report = buildDebugReport(extra);
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return report;
}
