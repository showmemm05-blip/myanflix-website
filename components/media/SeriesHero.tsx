"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import {
  CrownIcon,
  HeroActions,
  HeroMeta,
  HeroPager,
  HeroShell,
  HeroSynopsis,
  HeroTags,
  HeroTitle,
  InfoIcon,
  PlayIcon,
  Rating,
  Tag,
} from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { seriesService } from "@/services/api/seriesService";
import type { SeriesListItem } from "@/types/series";
import { HeroAnnouncer } from "./HeroAnnouncer";
import { isRecent } from "./media-data";

interface EpisodeTarget {
  href: string;
  season: number;
  episode: number;
  resume: boolean;
  percent: number;
  title: string;
  minutesLeft: number;
}

/**
 * Where the hero's main button goes for one series. With a session the
 * player's own episode list (with this viewer's progress) picks the episode
 * in progress — "Resume S1 E3" — or the next unwatched one; without one, the
 * public episode list gives S1 E1. Both are the queries the series and
 * player pages already use (same keys), asked only while this series is the
 * one on show and only when the viewer can watch it.
 */
// The hero rotates every 8s through up to 12 series, so a slide comes round
// again well inside a few minutes: keep its episode list for 5 minutes
// instead of re-asking every time it returns (the label only names the
// episode to start from).
const EPISODE_TARGET_STALE_MS = 5 * 60_000;

function useEpisodeTarget(seriesId: string, enabled: boolean, signedIn: boolean): EpisodeTarget | null {
  const playerEpisodes = useQuery({
    queryKey: ["series", seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(seriesId),
    enabled: enabled && signedIn,
    staleTime: EPISODE_TARGET_STALE_MS,
  });
  const episodes = useQuery({
    queryKey: ["series", seriesId, "episodes"],
    queryFn: () => seriesService.getEpisodes(seriesId),
    enabled: enabled && !signedIn,
    staleTime: EPISODE_TARGET_STALE_MS,
  });

  if (signedIn && playerEpisodes.data) {
    const flat = playerEpisodes.data.seasons.flatMap((season) =>
      season.episodes.map((ep, i) => ({ ...ep, season: season.seasonNumber, number: ep.episodeNumber ?? i + 1 })),
    );
    if (flat.length === 0) return null;
    let pick = flat[0];
    let resume = false;
    for (let i = flat.length - 1; i >= 0; i--) {
      const pct = flat[i].watchProgress?.progressPercent ?? 0;
      if (pct > 0 && pct < RESUME_COMPLETE_PERCENT) {
        pick = flat[i];
        resume = true;
        break;
      }
      if (pct >= RESUME_COMPLETE_PERCENT) {
        pick = flat[Math.min(i + 1, flat.length - 1)];
        break;
      }
    }
    const progress = pick.watchProgress;
    const percent = resume && progress ? Math.round(progress.progressPercent) : 0;
    return {
      href: resume && progress ? resumeHref(pick.id, progress.progressPercent, progress.lastPositionSeconds) : `/player/${pick.id}`,
      season: pick.season,
      episode: pick.number,
      resume,
      percent,
      title: pick.title,
      minutesLeft: Math.max(1, Math.round((pick.duration * (100 - percent)) / 100)),
    };
  }

  if (!signedIn && episodes.data && episodes.data.length > 0) {
    const first = episodes.data[0];
    return {
      href: `/player/${first.id}`,
      season: first.seasonNumber ?? 1,
      episode: first.episodeNumber ?? 1,
      resume: false,
      percent: 0,
      title: first.title,
      minutesLeft: first.duration,
    };
  }
  return null;
}

/**
 * THE SERIES HUB HERO (MediaSeries.dc.html) — five featured series behind
 * the story pager. The main button reads "Resume S1 E3" (with a progress
 * line) when the viewer has started the show, "Play S1 E1" otherwise, and
 * turns into the gold "Subscribe to watch" when the viewer can't watch.
 * No My List: the website's watchlist only holds movies.
 */
export function SeriesHero({
  series,
  headingLevel = "h1",
  size = "hub",
  label,
  kicker,
}: {
  series: SeriesListItem[];
  headingLevel?: "h1" | "h2";
  size?: "hub" | "detail";
  label?: string;
  kicker?: string;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();
  const pathname = usePathname();
  const params = useSearchParams();
  const [index, setIndex] = useState(0);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const picks = series.slice(0, 5);
  const count = picks.length;
  const safeIndex = count > 0 ? index % count : 0;
  const show = picks[safeIndex];
  const premium = show?.accessType === "SUBSCRIPTION";
  const canWatch = Boolean(show) && (!premium || isSubscribed);
  const target = useEpisodeTarget(show?.id ?? "", Boolean(show) && canWatch, isAuthenticated);

  if (!show) return null;

  const isNew = isRecent(show.createdAt);
  const query = params.toString();
  const here = query ? `${pathname}?${query}` : pathname;
  const playText = target
    ? target.resume
      ? m.resumeEpisode(target.season, target.episode)
      : m.playEpisode(target.season, target.episode)
    : t.browse.play;

  return (
    <>
      <HeroAnnouncer
        slides={count}
        paused={subscribeOpen}
        announcement={s.slideOf(show.title, safeIndex + 1, count)}
      >
        <HeroShell
          size={size}
          imageUrl={show.coverUrl ?? show.posterUrl}
          seed={show.title}
          artKey={show.id}
          label={label ?? m.featuredSeries}
          carousel={count > 1}
        >
          <div>
            <HeroTags>
              {isNew && <Tag kind="new">{s.newTag}</Tag>}
              {premium ? <Tag kind="premium">{s.premiumTag}</Tag> : <Tag kind="free">{s.freeTag}</Tag>}
              <span className="text-sm leading-5 font-semibold text-fg-body">
                {kicker ?? (isNew ? m.recentlyAdded : s.featured)}
              </span>
            </HeroTags>
            <HeroTitle as={headingLevel} className={size === "detail" ? "text-[clamp(36px,3.8vw,56px)]" : undefined}>
              {show.title}
            </HeroTitle>
            <HeroMeta>
              {show.rating > 0 && <Rating value={show.rating} size="lg" />}
              <span>{show.releaseYear}</span>
              <span>{t.browse.episodeCount(show.episodeCount)}</span>
              <span>{show.genre}</span>
            </HeroMeta>
            {size === "hub" && show.description && <HeroSynopsis>{show.description}</HeroSynopsis>}
          </div>
          <HeroActions className={size === "detail" ? "mt-[22px]" : undefined}>
            {canWatch ? (
              <Link
                href={target?.href ?? `/series/${show.id}`}
                aria-label={target ? m.titledAction(playText, show.title) : s.play(show.title)}
                className={buttonVariants({ variant: "play", size: "hero", className: "tabular-nums" })}
              >
                <PlayIcon size={20} />
                {playText}
              </Link>
            ) : isAuthenticated ? (
              <Button variant="gold" size="hero" className="px-6" onClick={() => setSubscribeOpen(true)}>
                <CrownIcon size={18} />
                {t.movieDetail.subscribeToWatch}
              </Button>
            ) : (
              <Link href={loginHref(here)} className={buttonVariants({ variant: "gold", size: "hero", className: "px-6" })}>
                <CrownIcon size={18} />
                {t.movieDetail.subscribeToWatch}
              </Link>
            )}
            <Link
              href={`/series/${show.id}`}
              aria-label={m.moreAbout(show.title)}
              className={buttonVariants({ variant: "tonal", size: "icon-hero" })}
            >
              <InfoIcon size={22} />
            </Link>
          </HeroActions>
          {canWatch && target?.resume && (
            <div className="mt-4 flex max-w-[400px] items-center gap-3">
              <span aria-hidden className="h-[3px] flex-1 rounded-[2px] bg-white/22">
                <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${target.percent}%` }} />
              </span>
              <span className="shrink-0 text-[13px] leading-[18px] text-fg-muted tabular-nums">
                {m.episodeLeft(target.episode, target.title, target.minutesLeft)}
              </span>
            </div>
          )}
          {count > 1 && (
            <HeroPager
              count={count}
              index={safeIndex}
              onSelect={setIndex}
              onAdvance={() => setIndex((i) => (i + 1) % count)}
              paused={subscribeOpen}
              label={label ?? m.featuredSeries}
              itemLabel={(i) => s.slideOf(picks[i].title, i + 1, count)}
              className="mt-6"
            />
          )}
        </HeroShell>
      </HeroAnnouncer>
      {isAuthenticated && <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />}
    </>
  );
}
