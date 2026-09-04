"use client";

import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

import { RevealSection } from "@/components/home/RevealSection";
import { StoreHeading, StoreSection } from "@/components/home/StoreSection";
import { Chip } from "@/components/system/Chip";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { LANES, type Lane } from "@/lib/home/lanes";

/**
 * EXPLORE MORE — the hand-off strip to the rest of MyanFlix.
 *
 * Deliberately the quietest section on the page: the storefront above it is
 * the destination, and Movies · Books · Music are exits. Three link plates,
 * no artwork, no motion beyond the shared reveal and a hover nudge — anything
 * louder would compete with the shelf it sits under.
 *
 * The rows are pure functions of the lane registry; the strip hard-picks its
 * three because it is a CATALOGUE hand-off, not a category index (games live
 * above, series shares film's surface, announced lanes belong to Discover).
 */
const EXPLORE_LANES: Lane[] = [LANES.film, LANES.book, LANES.music];

/**
 * Signed out, /media/movies and /media/books are dead ends by design:
 * BrowseSurface has no auth branch, so a logged-out visitor gets skeletons
 * and then a false "nothing here". The gate therefore lives on the LINK —
 * gated lanes route through /login?next=<destination> until there is a
 * session. Music is the exception: its surface is local-data preview and
 * works for everyone, so it always links direct (and carries the registry's
 * preview label instead of a lock).
 */
function laneHref(lane: Lane, isAuthenticated: boolean): string {
  // Registry invariant: every non-announced lane carries a real href.
  const href = lane.href ?? "/media";
  if (lane.key === "music" || isAuthenticated) return href;
  return `/login?next=${encodeURIComponent(href)}`;
}

export function StoreExploreMore() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <RevealSection>
      {/* as="div": RevealSection already renders the <section> landmark. */}
      <StoreSection as="div" pad="tight">
        <StoreHeading kicker={t.home.store.explore.kicker} title={t.home.store.explore.title} />

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {EXPLORE_LANES.map((lane) => {
            const Icon = lane.icon;
            const gated = lane.key !== "music" && !isAuthenticated;

            return (
              <Link
                key={lane.key}
                href={laneHref(lane, isAuthenticated)}
                className="group flex items-center justify-between gap-3 rounded-lg bg-card/40 px-4 py-3.5 ring-1 ring-white/8 ring-inset transition-colors duration-200 outline-none hover:bg-card/70 hover:ring-white/14 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-3">
                  <Icon aria-hidden className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.home.lanes[lane.nameKey]}</span>
                  {lane.key === "music" && (
                    // The registry's honesty label: music is shipped but not
                    // real, and the strip says so rather than implying a
                    // catalogue that isn't there.
                    <Chip size="sm" tone="neutral">
                      {t.home.state.preview}
                    </Chip>
                  )}
                </span>

                {gated ? (
                  // Visible text, not a title-attr: the row's destination is
                  // the login page, and the reader deserves to know before
                  // the click.
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock aria-hidden className="size-3" />
                    {t.home.store.explore.locked}
                  </span>
                ) : (
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </StoreSection>
    </RevealSection>
  );
}
