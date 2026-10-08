import type { ComponentType } from "react";

/** One navigable destination (kept for older call sites). */
export interface NavDestination {
  /** Stable key — the href can carry a query string, this must not. */
  key: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Unread/pending count rendered as a dot or number. */
  badge?: number;
}

/**
 * Home only matches exactly; every other destination also matches its own
 * subtree, so /wallet?tab=x and /settings/anything keep their entry lit.
 * Matching on the path segment (not a bare `startsWith`) is what stops
 * /movie/123 from lighting up /movies.
 */
export function isActiveHref(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The three Marquee tabs (top-bar nav on desktop, the dock on phones). */
export type ShellTab = "home" | "media" | "wallet";

export const SHELL_TAB_HREF: Record<ShellTab, string> = {
  home: "/",
  media: "/media",
  wallet: "/wallet",
};

const under = (pathname: string, ...roots: string[]) => roots.some((root) => isActiveHref(pathname, root));

/**
 * Which tab a page lights up (SHELL.md "Tab ownership"). The account pages —
 * Profile, My List, Watch history, Library, Notifications, Settings — light
 * none (owner, 2026-10-07: Profile left the nav because the avatar menu
 * already opens it), as the mobile app shows no tab on Profile. Privacy and
 * anything unknown light none too.
 */
export function activeShellTab(pathname: string): ShellTab | null {
  if (pathname === "/") return "home";
  if (under(pathname, "/media", "/search", "/movie", "/movies", "/series", "/books")) return "media";
  if (under(pathname, "/wallet", "/transactions")) return "wallet";
  return null;
}

/** Routes that render without any shell chrome (the full-screen player). */
export function isImmersiveRoute(pathname: string): boolean {
  return under(pathname, "/player", "/read");
}

/** The sign-in family: minimal bar (logo + language), no nav, no dock, no footer. */
export function isAuthRoute(pathname: string): boolean {
  return under(pathname, "/login", "/register", "/forgot-password");
}

/** The Media hub family, which carries the chip strip under the bar. */
export function isMediaHubRoute(pathname: string): boolean {
  return under(pathname, "/media");
}
