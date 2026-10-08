"use client";

import Link from "next/link";

import { BookIcon, FilmIcon, MusicIcon, TvIcon } from "@/components/home/arcade/HomeIcons";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { ChevronRightIcon, LockIcon } from "@/components/system/icons";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { LANES, type Lane, type LaneKey } from "@/lib/home/lanes";

/**
 * EXPLORE MORE (Main.dc.html §7) — the quiet hand-off to the rest of
 * MyanFlix: four flat raised tiles, Film · Series · Book · Music (two per row
 * on phones). Each shows a crimson icon, the name and the lane's verb, and
 * on the right a chevron — or "Preview" for Music (a shipped surface on
 * local data, labelled honestly), or a lock + "Sign in to browse" for Books
 * when nobody is signed in.
 *
 * Movies and series are browsable signed out; books are members-only, so a
 * guest's Book tile goes through /login?next=<destination>. Music always
 * links direct.
 */
const EXPLORE_LANES: Lane[] = [LANES.film, LANES.series, LANES.book, LANES.music];

const ICON: Partial<Record<LaneKey, typeof FilmIcon>> = {
  film: FilmIcon,
  series: TvIcon,
  book: BookIcon,
  music: MusicIcon,
};

function laneHref(lane: Lane, isAuthenticated: boolean): string {
  // Series links the way the Media chip strip does (`tab=series`, the
  // spelling the catalog keeps in the address bar).
  const href = lane.key === "series" ? MEDIA_CHIP_HREF.series : (lane.href ?? "/media");
  if (lane.key !== "book" || isAuthenticated) return href;
  return loginHref(href);
}

export function StoreExploreMore() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  return (
    <StoreSection headingId="h-explore">
      <StoreHeading id="h-explore" eyebrow={t.home.store.explore.kicker} title={t.home.store.explore.title} />
      <div className="mt-5 grid grid-cols-4 gap-x-4 gap-y-3 max-desk:grid-cols-2">
        {EXPLORE_LANES.map((lane) => {
          const Icon = ICON[lane.key];
          const gated = lane.key === "book" && !isAuthenticated;
          const preview = lane.state === "preview";

          return (
            <Link
              key={lane.key}
              href={laneHref(lane, isAuthenticated)}
              className="flex h-[120px] min-w-0 flex-col justify-between rounded-landscape bg-raised p-4 transition-colors duration-200 hover:bg-raised-hover"
            >
              <span className="flex items-center justify-between gap-2">
                {Icon ? (
                  <Icon size={24} className="shrink-0 text-link" />
                ) : (
                  <lane.icon aria-hidden size={24} strokeWidth={1.75} className="shrink-0 text-link" />
                )}
                {preview ? (
                  <span className="h-6 rounded-full bg-white/10 px-[9px] text-[12px] leading-6 font-bold text-fg-body">
                    {t.home.state.preview}
                  </span>
                ) : gated ? (
                  // Visible words, not a tooltip: the tile opens sign-in, and
                  // the reader deserves to know before the click.
                  <span className="flex min-w-0 items-center gap-[5px] text-[12px] leading-4 font-bold text-fg-muted">
                    <LockIcon size={13} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{t.home.store.explore.locked}</span>
                  </span>
                ) : (
                  <ChevronRightIcon size={18} strokeWidth={2.2} className="text-fg-faint" />
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-[17px] leading-6 font-extrabold text-fg">{t.home.lanes[lane.nameKey]}</span>
                <span className="text-caption text-fg-faint">{t.home.verbs[lane.verbKey]}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </StoreSection>
  );
}
