"use client";

import Link from "next/link";

import { GameArt, gameArtBg } from "@/components/home/arcade/GameArt";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { ChevronRightIcon, PeopleIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { formatCompactNumber } from "@/lib/format";
import { GAME_HREF, LIVE_NOW } from "@/lib/home/store";
import { usePeakUsers } from "@/lib/hooks/use-peak-users";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";

/**
 * LIVE AND BUSY (Main.dc.html §5) — a heading column on the left (beating
 * red dot, title, and the platform's real peak-viewers line) and a 2×2 grid
 * of flat surface tiles for the four busiest games: a 16:9 thumb with a Live
 * label, the title, "15.6K playing", and a gold event line when one runs.
 * One column on phones.
 *
 * The player counts are STATIC mock figures (honesty rule: they never tick).
 * The one real number is the peak-viewers line, read through the shared
 * ['peak-users'] query the shell already warmed — reading it here never
 * fires a second request. It hides itself while loading or when the figure
 * would not impress (usePeakUsers returns null); no skeleton.
 */
export function StoreLive() {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const peak = usePeakUsers();

  return (
    <StoreSection headingId="h-live">
      <div className="mq-stack grid grid-cols-[minmax(0,4fr)_minmax(0,8fr)] items-start gap-x-[clamp(24px,3vw,48px)] gap-y-6">
        <div>
          <StoreHeading
            id="h-live"
            eyebrow={
              <>
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-danger shadow-[0_0_0_4px_color-mix(in_srgb,var(--mq-danger)_18%,transparent)] animate-mq-pulse"
                />
                {t.home.store.live.kicker}
              </>
            }
            title={t.home.store.live.title}
          />
          {peak !== null && (
            // Whole translated sentence around a formatted figure.
            <p className="mt-3 flex items-center gap-2 text-body-muted nums">
              <PeopleIcon size={18} className="shrink-0 text-money" />
              {t.nav.peakViewers(peak.toLocaleString("en-US"))}
            </p>
          )}
        </div>

        <div className="mq-stack grid grid-cols-2 gap-x-4 gap-y-3">
          {LIVE_NOW.map((game) => {
            const count = game.playersOnline !== null ? formatCompactNumber(game.playersOnline) : null;
            const event = game.eventKey !== null ? t.home.store.events[game.eventKey] : null;
            return (
              <Link
                key={game.id}
                href={GAME_HREF}
                aria-label={
                  count === null
                    ? game.title
                    : event
                      ? h.liveCardEvent(game.title, count, event)
                      : h.liveCard(game.title, count)
                }
                className="group/card flex min-w-0 items-center gap-4 rounded-landscape bg-surface p-3 transition-colors duration-200 hover:bg-raised"
              >
                <span
                  className="relative block aspect-video w-[clamp(120px,11vw,160px)] shrink-0 overflow-hidden rounded-card"
                  style={{ backgroundColor: gameArtBg(game) }}
                >
                  <GameArt game={game} variant="landscape" zoom />
                  <span className="absolute top-0 left-0 flex h-[22px] items-center gap-1 rounded-br-[6px] bg-art-badge px-2 text-[11px] leading-[14px] font-extrabold text-danger">
                    <span aria-hidden className="size-[5px] rounded-full bg-danger animate-mq-pulse" />
                    {t.home.store.badge.live}
                  </span>
                </span>
                {/* A div so the title can be a real h3 (heading-by-heading navigation). */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="truncate text-base leading-[22px] font-extrabold text-fg transition-colors duration-150 group-hover/card:text-link">
                    {game.title}
                  </h3>
                  {count !== null && (
                    <span className="text-sm leading-5 text-fg-muted">
                      <span className="font-extrabold text-fg nums">{count}</span> {t.home.store.live.playing}
                    </span>
                  )}
                  {event !== null && (
                    <span className="text-[13px] leading-[18px] font-semibold text-gold">
                      {t.home.store.live.eventLive} · {event}
                    </span>
                  )}
                </div>
                <ChevronRightIcon size={18} strokeWidth={2.2} className="shrink-0 text-fg-faint" />
              </Link>
            );
          })}
        </div>
      </div>
    </StoreSection>
  );
}
