/**
 * Security response headers for every page the website serves (M-31).
 *
 * Pure functions — no Next import — so `next.config.ts` can call them at
 * build time and `headers.test.ts` can check them without a browser.
 *
 * The Content-Security-Policy says which origins the browser may load
 * scripts, images, video, fonts and API calls from. Everything is derived
 * from `NEXT_PUBLIC_API_BASE_URL` (the only origin the bundle knows about):
 *
 *   - the API origin itself (REST, /storage/... assets, the Socket.IO
 *     websocket, so also its ws:/wss: forms);
 *   - the cache server that serves posters and HLS video — the backend builds
 *     those URLs from the hostname the API request came in on, port 8080
 *     (backend MinioService.playbackUrl), so the same hostname on :8080;
 *   - accounts.google.com for "Continue with Google";
 *   - the two picture hosts next.config.ts already allowed for remote images.
 *
 * Anything else a deployment needs (a cache server on a different host or
 * port, a CDN) goes in `CSP_EXTRA_ORIGINS`, space separated.
 *
 * Why `'unsafe-inline'` in script-src: an App Router page is hydrated by
 * small inline scripts Next writes into the HTML, and their contents change
 * per page, so they cannot be hashed. The nonce alternative needs a proxy
 * that renders every page dynamically, which would turn the current static
 * pages into per-request renders — not a change to make in a security fix.
 * The policy still blocks loading scripts from any other host, and fetch /
 * XHR / websocket to any host that is not listed, which is what stops an
 * injected script from calling home.
 *
 * Why most of it is Report-Only by default: a wrong origin in this list
 * would silently break posters or playback for every visitor. Report-Only
 * makes the browser log each violation in the console without blocking, so
 * a deployment can be checked first; `CSP_ENFORCE=1` at build time turns the
 * whole policy into the blocking header.
 *
 * Four directives are enforced on every response regardless, because they
 * say nothing about where the page may load things from, so no origin
 * mistake can break them: `frame-ancestors 'none'` (no framing, so no
 * clickjacking), `object-src 'none'` (no Flash-style plugins), `base-uri
 * 'self'` (an injected <base> cannot redirect every relative URL) and
 * `form-action 'self'` (an injected form cannot post the page's fields to
 * another site). They go out as a small blocking Content-Security-Policy
 * next to the Report-Only one; once enforced, the single full header
 * carries them. The non-CSP headers below are always enforced too.
 */

export interface SecurityHeaderOptions {
  /** NEXT_PUBLIC_API_BASE_URL — e.g. http://localhost:3001/api. */
  apiBaseUrl: string | undefined;
  /** CSP_EXTRA_ORIGINS — extra allowed origins, space separated. */
  extraOrigins?: string | undefined;
  /** CSP_ENFORCE — "1"/"true" sends the blocking header instead of Report-Only. */
  enforce?: string | boolean | undefined;
  /** `next dev` needs 'unsafe-eval' for React's debug stack traces. */
  development?: boolean;
}

export interface ResponseHeader {
  key: string;
  value: string;
}

/** Port the cache server (posters + HLS) listens on next to the API host. */
export const CACHE_SERVER_PORT = "8080";

const DEFAULT_API_BASE_URL = "http://localhost:3001/api";

const GOOGLE_ORIGIN = "https://accounts.google.com";

/** Remote picture hosts the pages load directly (picsum = the Music mock data, lib/media/music-data.ts). */
const PICTURE_ORIGINS = ["https://picsum.photos"];

export function isEnforced(flag: string | boolean | undefined): boolean {
  if (typeof flag === "boolean") return flag;
  const v = (flag ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseApiUrl(apiBaseUrl: string | undefined): URL {
  const raw = (apiBaseUrl ?? "").trim() || DEFAULT_API_BASE_URL;
  try {
    return new URL(raw);
  } catch {
    return new URL(DEFAULT_API_BASE_URL);
  }
}

function websocketOrigin(api: URL): string {
  const scheme = api.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${api.host}`;
}

/** Cache-server origin: the API hostname on :8080, same scheme as the API. */
export function cacheServerOrigin(apiBaseUrl: string | undefined): string {
  const api = parseApiUrl(apiBaseUrl);
  return `${api.protocol}//${api.hostname}:${CACHE_SERVER_PORT}`;
}

export function parseExtraOrigins(extra: string | undefined): string[] {
  return (extra ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** The origins the website talks to for data, pictures and video. */
export function allowedOrigins(options: SecurityHeaderOptions): {
  api: string;
  ws: string;
  cache: string;
  extra: string[];
} {
  const api = parseApiUrl(options.apiBaseUrl);
  return {
    api: api.origin,
    ws: websocketOrigin(api),
    cache: cacheServerOrigin(options.apiBaseUrl),
    extra: parseExtraOrigins(options.extraOrigins),
  };
}

function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

type Directive = [name: string, values: string[]];

function serialize(directives: Directive[]): string {
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/**
 * The part of the policy that is always blocking, Report-Only or not. Only
 * directives that do not control what the page loads belong here — adding a
 * `*-src` directive would reintroduce the "wrong origin breaks playback" risk.
 */
const ALWAYS_ENFORCED: Directive[] = [
  ["base-uri", ["'self'"]],
  ["object-src", ["'none'"]],
  ["frame-ancestors", ["'none'"]],
  ["form-action", ["'self'"]],
];

/** The small blocking policy sent while the full one is still Report-Only. */
export function buildBaselinePolicy(): string {
  return serialize(ALWAYS_ENFORCED);
}

export function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const { api, ws, cache, extra } = allowedOrigins(options);
  const dev = options.development === true;

  const directives: Directive[] = [
    ["default-src", ["'self'"]],
    ...ALWAYS_ENFORCED,
    ["script-src", ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), GOOGLE_ORIGIN]],
    // Tailwind and React components set inline styles; the Google button injects its own.
    ["style-src", ["'self'", "'unsafe-inline'", GOOGLE_ORIGIN]],
    // blob: = the profile-photo preview (URL.createObjectURL); data: = inline SVG art.
    ["img-src", unique(["'self'", "data:", "blob:", api, cache, ...PICTURE_ORIGINS, ...extra])],
    // next/font self-hosts every face; data: covers inlined icon fonts.
    ["font-src", ["'self'", "data:"]],
    // REST + websocket to the API, playlists/segments from the cache server,
    // the Google sign-in library's own calls.
    ["connect-src", unique(["'self'", api, ws, cache, GOOGLE_ORIGIN, ...extra])],
    // blob: = hls.js feeds the <video> through MediaSource object URLs.
    ["media-src", unique(["'self'", "blob:", api, cache, ...extra])],
    // hls.js runs its demuxer in a Worker created from a blob: URL.
    ["worker-src", ["'self'", "blob:"]],
    ["frame-src", [GOOGLE_ORIGIN]],
    ["manifest-src", ["'self'"]],
  ];

  return serialize(directives);
}

/**
 * Every security header the site sends. The full CSP is blocking only when
 * enforced; otherwise the baseline part blocks and the full policy reports.
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): ResponseHeader[] {
  const csp = buildContentSecurityPolicy(options);
  const cspHeaders: ResponseHeader[] = isEnforced(options.enforce)
    ? [{ key: "Content-Security-Policy", value: csp }]
    : [
        { key: "Content-Security-Policy", value: buildBaselinePolicy() },
        { key: "Content-Security-Policy-Report-Only", value: csp },
      ];

  return [
    ...cspHeaders,
    // Older browsers that ignore frame-ancestors still honour this one.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
}
