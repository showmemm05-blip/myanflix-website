import type { LucideIcon } from "lucide-react";

/** One navigable destination in the rail, the tab bar, or the overflow sheet. */
export interface NavDestination {
  /** Stable key — the href can carry a query string, this must not. */
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
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
