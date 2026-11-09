import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * THE TMDB LOGO IS AN OPTIONAL FILE: public/credits/tmdb-logo.svg.
 *
 * It must be TMDB's own artwork (their "Logos & Attribution" page), never a
 * redrawing, and a build downloads nothing, so the file is put there by
 * hand once the owner says so. Until then it is simply absent, and the About
 * page shows the credit as text alone.
 *
 * `tmdbLogoSrc()` answers "is the file there?" on the server: the address to
 * load, or null. /about is prerendered, so the answer is taken when the site
 * is built: add the file, rebuild, and the logo appears with no code change.
 * Asking in the browser instead would cost every visitor a failed request
 * for as long as the file is missing.
 *
 * Server only (node:fs): call it from a server component, never from a
 * "use client" file. No "@/…" or relative imports, so
 * `node --test lib/credits/tmdb-logo.test.ts` runs it as is.
 */

/** Where the browser loads the logo from (a file under public/ is served from the site root). */
export const TMDB_LOGO_PUBLIC_PATH = "/credits/tmdb-logo.svg";

/** `root` is the website's folder — the one that holds public/. */
export function tmdbLogoSrc(root: string = process.cwd()): string | null {
  return existsSync(join(root, "public", "credits", "tmdb-logo.svg")) ? TMDB_LOGO_PUBLIC_PATH : null;
}
