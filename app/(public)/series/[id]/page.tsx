"use client";

import { use, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ListVideo, LogIn, Tv } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { seriesToBrowseItem } from "@/components/browse/browse-item";
import {
  Artwork,
  CheckIcon,
  CrownIcon,
  FilterChip,
  HeroMeta,
  HeroTags,
  HeroTitle,
  LockIcon,
  MediaCard,
  PlayIcon,
  Rating,
  Row,
  ShareIcon,
  Tag,
} from "@/components/system";
import { seriesService } from "@/services/api/seriesService";
import { useAuth } from "@/lib/context/auth-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { titlesText } from "@/lib/i18n/sections/titles";
import { loginHref } from "@/lib/auth/return-to";
import { formatDuration, UNKNOWN_DURATION } from "@/lib/format";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import type { PlayerEpisodeProgress } from "@/types/series";
import { DetailHero, HeroChips, HeroProgress, HeroSynopsisToggle } from "../../movie/_detail/DetailHero";
import {
  CastRow,
  CountTiles,
  DetailColumns,
  DetailsPanel,
  TitleNotFound,
  TitleSkeleton,
  type CastPerson,
  type DetailFact,
} from "../../movie/_detail/DetailPanels";

const SERIES_HREF = "/media/movies?tab=series";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const shell = useSection(shellText);
  const titleId = useId();
  const { data: series, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => seriesService.getSeriesById(id),
    enabled: Boolean(id),
  });
  const { data: episodes } = useQuery({
    queryKey: ["series", id, "episodes"],
    queryFn: () => seriesService.getEpisodes(id),
    enabled: Boolean(id),
  });
  const { isSubscribed } = useSubscription();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // The viewer's own per-episode progress — the same members-only read (and
  // the same cache entry) as the player's episode list. It is what draws the
  // progress lines, the "Watched" ticks, Resume and "Up next".
  const { data: playerEpisodes } = useQuery({
    queryKey: ["series", id, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(id),
    enabled: Boolean(id) && isAuthenticated,
  });

  // "More {genre} series": the series catalog filtered to this show's genre.
  const genre = series?.genre ?? "";
  const { data: sameGenre } = useQuery({
    queryKey: ["series", "more-like", genre],
    queryFn: ({ signal }) => seriesService.getSeries({ genres: [genre], limit: 13 }, { signal }),
    enabled: Boolean(genre),
    staleTime: 5 * 60_000,
  });

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  // A guest can read the page but never watch — the CTA and every episode
  // row become "Sign in to watch" whatever the access type, and the
  // subscribe dialog (whose own queries need a session) never opens.
  // Settled auth only, so a returning member's profile load doesn't flash
  // the guest state first.
  const isGuest = !isAuthenticated && !isAuthLoading;
  const signInHref = loginHref(`/series/${id}`);
  const hasAccess = Boolean(series && (series.accessType === "FREE" || isSubscribed));
  const canWatch = hasAccess && !isGuest;

  const seasons = useMemo(() => {
    const map = new Map<number, Movie[]>();
    for (const episode of episodes ?? []) {
      const season = episode.seasonNumber ?? 1;
      if (!map.has(season)) map.set(season, []);
      map.get(season)!.push(episode);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    }
    return new Map([...map.entries()].sort(([a], [b]) => a - b));
  }, [episodes]);

  /** Episode id → the viewer's saved progress (null = never started). */
  const progressById = useMemo(() => {
    const map = new Map<string, PlayerEpisodeProgress | null>();
    for (const season of playerEpisodes?.seasons ?? []) {
      for (const episode of season.episodes) map.set(episode.id, episode.watchProgress);
    }
    return map;
  }, [playerEpisodes]);

  const seasonNumbers = [...seasons.keys()];
  // Falls back to the first season until the viewer picks one, so the list is
  // never empty just because nothing has been clicked yet.
  const selectedSeason = activeSeason !== null && seasons.has(activeSeason) ? activeSeason : seasonNumbers[0];
  const visibleEpisodes = selectedSeason !== undefined ? (seasons.get(selectedSeason) ?? []) : [];
  const firstEpisode = episodes?.[0] ?? null;

  // Resume = the last episode, in viewing order, that is started but not
  // finished; "Up next" is simply the one after it.
  const ordered = [...seasons.values()].flat();
  const percentOf = (episode: Movie) => progressById.get(episode.id)?.progressPercent ?? 0;
  const resumeIndex = canWatch
    ? ordered.reduce((found, episode, i) => {
        const pct = percentOf(episode);
        return pct > 0 && pct < RESUME_COMPLETE_PERCENT ? i : found;
      }, -1)
    : -1;
  const resumeEpisode = resumeIndex >= 0 ? ordered[resumeIndex] : null;
  const upNextEpisode = resumeIndex >= 0 ? (ordered[resumeIndex + 1] ?? null) : null;

  if (isLoading) return <TitleSkeleton kind="title" label={s.loadingTitle} />;

  if (!series) {
    return (
      <TitleNotFound
        icon={<Tv className="size-7" strokeWidth={1.75} />}
        title={t.seriesDetail.notFoundTitle}
        body={t.seriesDetail.notFoundBody}
        backHref={SERIES_HREF}
        backLabel={t.seriesDetail.backToSeries}
      />
    );
  }

  const premium = series.accessType === "SUBSCRIPTION";
  const seriesCatalogHref = `${SERIES_HREF}&genres=${encodeURIComponent(series.genre)}`;
  const episodeTitle = (episode: Movie) => episode.title || t.seriesDetail.episodeFallbackTitle(episode.episodeNumber ?? 0);
  const countLine = t.seriesDetail.seasonSummary(seasons.size, episodes?.length ?? 0);

  const people: CastPerson[] = series.actors.map((actor) => ({
    key: actor.id,
    name: actor.name,
    role: s.actor,
    imageUrl: actor.imageUrl,
    // There is no series-by-actor filter; the movie catalog by this actor is the closest page.
    href: `/media/movies?tab=movies&actorIds=${encodeURIComponent(actor.id)}`,
  }));

  const moreSeries = (sameGenre?.items ?? [])
    .filter((item) => item.id !== series.id)
    .slice(0, 12)
    .map((item) => seriesToBrowseItem(item, t.browse.episodeCount(item.episodeCount)));

  const facts: DetailFact[] = [
    { label: t.movieDetail.genre, value: series.genre },
    ...(series.categories.length > 0
      ? [{ label: t.movieDetail.categories, value: series.categories.map((c) => c.name).join(", ") }]
      : []),
    { label: t.movieDetail.language, value: series.language },
    { label: t.movieDetail.releaseYear, value: String(series.releaseYear) },
    {
      label: s.access,
      value: premium ? t.badges.premium : t.badges.free,
      tone: premium ? "gold" : "money",
    },
  ];

  const resumeProgress = resumeEpisode ? progressById.get(resumeEpisode.id) : null;
  const resumeLeft =
    resumeEpisode && resumeProgress && resumeEpisode.duration > 0
      ? Math.max(1, Math.round(resumeEpisode.duration - resumeProgress.lastPositionSeconds / 60))
      : null;

  return (
    <div className="flex flex-col">
      <DetailHero
        imageUrl={series.coverUrl ?? series.posterUrl}
        seed={series.title}
        backHref={SERIES_HREF}
        backLabel={t.seriesDetail.backToSeries}
        titleId={titleId}
      >
        <HeroTags>
          {premium ? <Tag kind="premium">{shell.premiumTag}</Tag> : <Tag kind="free">{shell.freeTag}</Tag>}
          <span className="text-sm leading-5 font-semibold text-fg-body">{t.nav.series}</span>
        </HeroTags>

        <HeroTitle className="max-w-3xl">
          <span id={titleId}>{series.title}</span>
        </HeroTitle>

        <HeroMeta>
          {/* 0 means "not rated" and shows nothing. */}
          {series.rating > 0 && (
            <span>
              <span className="sr-only">{s.rated(series.rating.toFixed(1))}</span>
              <span aria-hidden>
                <Rating value={series.rating} size="lg" />
              </span>
            </span>
          )}
          <span>{series.releaseYear}</span>
          <span>{countLine}</span>
          <span>{series.language}</span>
        </HeroMeta>

        <HeroChips
          label={s.genreAndCategories}
          chips={[
            { key: `genre:${series.genre}`, label: series.genre, href: seriesCatalogHref },
            ...series.categories
              .filter((category) => category.name !== series.genre)
              .map((category) => ({ key: category.id, label: category.name })),
          ]}
        />

        {series.description && <HeroSynopsisToggle>{series.description}</HeroSynopsisToggle>}

        <div className="mt-6 flex flex-wrap gap-3">
          {isAuthLoading ? (
            // Auth is still settling: hold the slot so neither "Start
            // watching" nor "Sign in" flashes before we know who is looking.
            <span aria-hidden className="mq-skeleton block h-[52px] w-40 rounded-[12px]" />
          ) : isGuest ? (
            <Link href={signInHref} className={buttonVariants({ variant: "play", size: "hero" })}>
              <LogIn aria-hidden strokeWidth={1.75} />
              {t.movieDetail.signInToWatch}
            </Link>
          ) : hasAccess ? (
            resumeEpisode && resumeProgress ? (
              <Link
                href={resumeHref(resumeEpisode.id, resumeProgress.progressPercent, resumeProgress.lastPositionSeconds)}
                aria-label={s.resumeEpisodeA11y(
                  series.title,
                  resumeEpisode.seasonNumber ?? 1,
                  resumeEpisode.episodeNumber ?? 0,
                  episodeTitle(resumeEpisode),
                )}
                className={buttonVariants({ variant: "play", size: "hero" })}
              >
                <PlayIcon />
                {s.resumeEpisode(resumeEpisode.seasonNumber ?? 1, resumeEpisode.episodeNumber ?? 0)}
              </Link>
            ) : firstEpisode ? (
              <Link
                href={`/player/${firstEpisode.id}`}
                aria-label={s.startWatchingA11y(series.title)}
                className={buttonVariants({ variant: "play", size: "hero" })}
              >
                <PlayIcon />
                {t.seriesDetail.startWatching}
              </Link>
            ) : (
              <span className="inline-flex h-[52px] items-center gap-2.5 rounded-[12px] bg-tonal-faint px-[22px] text-base font-bold text-fg-muted">
                <ListVideo aria-hidden className="size-5" strokeWidth={1.75} />
                {t.seriesDetail.noEpisodesTitle}
              </span>
            )
          ) : (
            // The one subscribe surface for the whole show — individual episodes are never gated separately.
            <Button variant="gold" size="hero" className="px-6" aria-haspopup="dialog" onClick={() => setSubscribeOpen(true)}>
              <CrownIcon size={17} />
              {t.movieDetail.subscribeToWatch}
            </Button>
          )}

          <a href="#episodes" className={cn(buttonVariants({ variant: "tonal", size: "hero" }), "px-[22px] text-base font-bold")}>
            <ListVideo aria-hidden className="size-5" strokeWidth={1.75} />
            {t.seriesDetail.episodes}
          </a>

          <Button
            variant="tonal"
            size="icon-hero"
            aria-haspopup="dialog"
            aria-label={s.share(series.title)}
            onClick={() => setShareOpen(true)}
          >
            <ShareIcon size={22} />
          </Button>
        </div>

        {resumeEpisode && resumeProgress && (
          <>
            <HeroProgress
              percent={resumeProgress.progressPercent}
              label={s.episodeWatched(resumeEpisode.episodeNumber ?? 0)}
              caption={resumeLeft !== null ? s.minutesLeft(resumeLeft) : shell.percentWatched(resumeProgress.progressPercent)}
            />
            <p className="mt-2.5 text-sm leading-5 text-fg-muted">
              {episodeTitle(resumeEpisode)}
              {upNextEpisode && (
                <>
                  {" · "}
                  <span className="text-fg-faint">{s.upNext}</span>{" "}
                  {s.upNextEpisode(upNextEpisode.episodeNumber ?? 0, episodeTitle(upNextEpisode))}
                </>
              )}
            </p>
          </>
        )}

        {hasAccess && premium && (
          <p className="mt-4 flex max-w-[56ch] items-start gap-2 text-sm leading-5 font-semibold text-gold">
            <span className="mt-[3px] shrink-0">
              <CrownIcon size={13} />
            </span>
            {t.seriesDetail.unlockedNote}
          </p>
        )}
      </DetailHero>

      <div className="mt-8 flex flex-col gap-[clamp(36px,3.4vw,52px)]">
        <DetailColumns
          asideLabel={s.aboutSeries}
          aside={
            <>
              <CountTiles
                tiles={[
                  { label: t.seriesDetail.seasons, value: seasons.size },
                  { label: t.seriesDetail.episodes, value: episodes?.length ?? 0 },
                ]}
              />
              <DetailsPanel facts={facts} />
            </>
          }
        >
          <section
            id="episodes"
            aria-labelledby={`${titleId}-eps`}
            className="min-w-0 scroll-mt-[calc(var(--shell-bar-h)+24px)]"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h2 id={`${titleId}-eps`} className="text-[clamp(24px,2.2vw,30px)] leading-[1.2] font-black tracking-[-0.02em] text-fg">
                  {t.seriesDetail.episodes}
                </h2>
                <p className="mt-1 text-sm leading-5 text-fg-faint tabular-nums">
                  {selectedSeason !== undefined ? s.seasonEpisodes(selectedSeason, visibleEpisodes.length) : countLine}
                </p>
              </div>
              {/* One season at a time. Stacking every season made a long show
                  an endless scroll with no way to jump. */}
              {seasonNumbers.length > 0 && (
                <div role="group" aria-label={s.season} className="mq-rail flex max-w-full gap-2 overflow-x-auto">
                  {seasonNumbers.map((number) => (
                    <FilterChip key={number} selected={number === selectedSeason} onClick={() => setActiveSeason(number)}>
                      {t.seriesDetail.seasonLabel(number)}
                    </FilterChip>
                  ))}
                </div>
              )}
            </div>

            {seasons.size === 0 ? (
              <EmptyState
                icon={Tv}
                title={t.seriesDetail.noEpisodesTitle}
                description={t.seriesDetail.noEpisodesBody}
                framed
                className="mt-5"
              />
            ) : (
              <ol className="m-0 mt-5 flex list-none flex-col gap-2 p-0">
                {visibleEpisodes.map((episode) => (
                  <li key={episode.id} className="mq-rise">
                    <EpisodeRow
                      episode={episode}
                      title={episodeTitle(episode)}
                      progress={canWatch ? (progressById.get(episode.id) ?? null) : null}
                      upNext={upNextEpisode?.id === episode.id}
                      hasAccess={canWatch}
                      isGuest={isGuest}
                      signInHref={signInHref}
                      onLockedClick={() => setSubscribeOpen(true)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </DetailColumns>

        {/* The show-level cast. CastRow renders nothing when there is none. */}
        <CastRow title={t.movieDetail.cast} subtitle={t.movieDetail.castCount(series.actors.length)} people={people} />

        {moreSeries.length > 0 && (
          <Row title={s.moreGenreSeries(series.genre)} seeAllHref={seriesCatalogHref}>
            {moreSeries.map((item) => (
              <MediaCard key={item.id} item={item} layout="rail" sizes="(max-width: 719px) 33vw, 184px" />
            ))}
          </Row>
        )}

        <CommentsSection
          seriesId={series.id}
          className="max-w-[calc(820px+2*clamp(16px,4vw,56px))] px-gutter"
        />
      </div>

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={series.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}

/**
 * ONE EPISODE ROW (SeriesDetail board): the big number, a 16:9 still with
 * its S·E code, progress line and Watched tick, the title with UP NEXT, the
 * time line and a two-line summary. Playable rows are links into the player
 * (a half-watched one resumes at its saved second); locked rows open the
 * plan picker (gold padlock) or go to sign-in. Episodes never carry their own
 * gate — access always comes from the parent series.
 */
function EpisodeRow({
  episode,
  title,
  progress,
  upNext,
  hasAccess,
  isGuest,
  signInHref,
  onLockedClick,
}: {
  episode: Movie;
  title: string;
  progress: PlayerEpisodeProgress | null;
  upNext: boolean;
  hasAccess: boolean;
  /** Locked because there is no session (not because of the plan): neutral sign-in cue, not the gold padlock. */
  isGuest: boolean;
  signInHref: string;
  onLockedClick: () => void;
}) {
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const pct = progress?.progressPercent ?? 0;
  const done = pct >= RESUME_COMPLETE_PERCENT;
  const inProgress = pct > 0 && !done;
  const minutes = episode.duration > 0 ? Math.round(episode.duration) : null;
  const minutesLeft =
    inProgress && progress && minutes ? Math.max(1, Math.round(episode.duration - progress.lastPositionSeconds / 60)) : null;
  const runtime = formatDuration(episode.duration) ?? UNKNOWN_DURATION;
  const season = episode.seasonNumber ?? 1;
  const number = episode.episodeNumber ?? 0;
  const lock = hasAccess ? null : isGuest ? ("signIn" as const) : ("subscribe" as const);

  const a11y = s.episodeA11y({
    number,
    title,
    minutes,
    playable: hasAccess,
    watched: done,
    minutesLeft,
    upNext,
    lock,
  });

  const body = (
    <>
      <span aria-hidden className="w-8 shrink-0 text-center text-[22px] leading-7 font-extrabold text-fg-faint tabular-nums max-desk:hidden">
        {episode.episodeNumber ?? "—"}
      </span>

      <span className="relative block aspect-video w-[clamp(168px,15vw,224px)] shrink-0 overflow-hidden rounded-[12px] bg-raised max-desk:w-32">
        <Artwork src={episode.coverUrl ?? episode.posterUrl} seed={`${title}-${episode.id}`} variant="landscape" sizes="224px" zoomOnHover={false} />
        <span aria-hidden className="absolute top-2 left-2 h-5 max-w-[calc(100%-40px)] truncate rounded-[4px] bg-art-badge px-1.5 text-[11px] leading-5 font-extrabold whitespace-nowrap text-fg tabular-nums">
          {s.episodeCode(season, number)}
        </span>
        {(inProgress || done) && (
          <span aria-hidden className="absolute right-2 bottom-[7px] left-2 block h-[3px] rounded-[2px] bg-white/25">
            <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${done ? 100 : pct}%` }} />
          </span>
        )}
        {done && (
          <span aria-hidden className="absolute top-2 right-2 flex size-[22px] items-center justify-center rounded-full bg-art-badge text-money">
            <CheckIcon size={14} strokeWidth={2.4} />
          </span>
        )}
        {hasAccess ? (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover/ep:opacity-100 group-focus-visible/ep:opacity-100"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-play text-ink">
              <PlayIcon size={20} />
            </span>
          </span>
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full bg-art-badge",
                isGuest ? "text-fg" : "text-gold",
              )}
            >
              {isGuest ? <LogIn className="size-4" strokeWidth={1.75} /> : <LockIcon size={16} />}
            </span>
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-base leading-[22px] font-extrabold text-fg">{title}</span>
          {upNext && (
            <span className="h-5 rounded-[4px] bg-crimson-soft px-[7px] text-[11px] leading-5 font-extrabold tracking-[0.06em] text-link [&:lang(my)]:tracking-normal">
              {s.upNextTag}
            </span>
          )}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[13px] leading-[18px] tabular-nums",
            done ? "text-money" : inProgress ? "text-link" : "text-fg-faint",
          )}
        >
          {runtime}
          {done ? ` · ${s.watched}` : minutesLeft !== null ? ` · ${s.minutesLeft(minutesLeft)}` : ""}
        </span>
        {episode.description && (
          <span className="mt-1.5 line-clamp-2 max-w-[64ch] text-sm leading-[21px] text-fg-muted max-desk:hidden">
            {episode.description}
          </span>
        )}
      </span>

      {lock === "subscribe" && (
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-gold/16 px-3 text-[13px] font-extrabold text-gold">
          <LockIcon size={14} />
          <span className="max-desk:hidden">{t.seriesDetail.lockedEpisode}</span>
        </span>
      )}
      {/* Guests need the words on every width — a plain padlock reads as
          "subscribe", and this label is the row's only sign-in cue. */}
      {lock === "signIn" && (
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-tonal-soft px-3 text-[13px] font-extrabold text-fg">
          <LogIn className="size-3.5" strokeWidth={1.75} />
          {t.movieDetail.signInToWatch}
        </span>
      )}
    </>
  );

  const rowClass = cn(
    "group/ep flex w-full cursor-pointer items-center gap-[clamp(12px,1.4vw,20px)] rounded-[16px] border-0 p-3 text-left text-fg transition-colors duration-150 outline-none hover:bg-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
    inProgress ? "bg-surface" : "bg-transparent",
  );

  if (hasAccess) {
    return (
      <Link
        href={inProgress && progress ? resumeHref(episode.id, pct, progress.lastPositionSeconds) : `/player/${episode.id}`}
        aria-label={a11y}
        className={rowClass}
      >
        {body}
      </Link>
    );
  }
  if (isGuest) {
    return (
      <Link href={signInHref} aria-label={a11y} className={rowClass}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" aria-haspopup="dialog" aria-label={a11y} onClick={onLockedClick} className={rowClass}>
      {body}
    </button>
  );
}
