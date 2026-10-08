import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

// Security headers (M-31). Computed once at build time, like NEXT_PUBLIC_*:
// the API origin comes from NEXT_PUBLIC_API_BASE_URL, extra origins from
// CSP_EXTRA_ORIGINS, and CSP_ENFORCE=1 switches the full Content-Security-
// Policy from Report-Only (console warnings only) to blocking. The parts that
// cannot break loading (no framing, no plugins, no <base>/form hijack) block
// either way. See lib/security/headers.ts for what each directive allows and why.
const securityHeaders = buildSecurityHeaders({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  extraOrigins: process.env.CSP_EXTRA_ORIGINS,
  enforce: process.env.CSP_ENFORCE,
  development: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) with
  // only the node_modules actually used traced in — what the Dockerfile
  // copies into the final image instead of the whole node_modules tree.
  output: "standalone",
  // No "X-Powered-By: Next.js" — nothing a visitor needs, one less hint for
  // an attacker fingerprinting the stack.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // No remotePatterns / dangerouslyAllowLocalIP: with `unoptimized: true`
    // next/image never fetches remote images itself, so those settings did
    // nothing. Which picture hosts the browser may load is decided by the
    // CSP img-src list in lib/security/headers.ts. If the optimizer is ever
    // turned on, add the real poster hosts back here deliberately.
    //
    // Next's server-side image optimizer runs inside this container, where
    // "localhost:8080" means the container itself, not the cache server —
    // there's no single hostname that's correct for both the optimizer's
    // internal fetch and the browser's public fetch. Skipping optimization
    // means the browser fetches these URLs directly instead, which already
    // works correctly.
    unoptimized: true,
  },
};

export default nextConfig;
