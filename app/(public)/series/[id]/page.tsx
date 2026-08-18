"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clapperboard,
  Clock,
  Crown,
  Globe,
  Layers,
  ListVideo,
  Lock,
  Play,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { AccessBadge, Chip, chipClass, Kicker, SectionHeader, StatTile, Surface } from "@/components/system";
import { seriesService } from "@/services/api/seriesService";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL, FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
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

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  const hasAccess = Boolean(series && (series.accessType === "FREE" || isSubscribed));

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

  const seasonNumbers = [...seasons.keys()];
  // Falls back to the first season until the viewer picks one, so the list is
  // never empty just because nothing has been clicked yet.
  const selectedSeason = activeSeason !== null && seasons.has(activeSeason) ? activeSeason : seasonNumbers[0];
  const visibleEpisodes = selectedSeason !== undefined ? (seasons.get(selectedSeason) ?? []) : [];
  const firstEpisode = episodes?.[0] ?? null;

  if (isLoading) return <SeriesSkeleton />;

  if (!series) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={Tv}
          title={t.seriesDetail.notFoundTitle}
          description={t.seriesDetail.notFoundBody}
          action={
            <Button render={<Link href="/movies?tab=series" />} nativeButton={false}>
              {t.seriesDetail.backToSeries}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Same stage construction as the movie detail page — the two pages should
          feel like one design, not two. */}
      <section className="relative isolate flex min-h-[74vh] flex-col justify-end overflow-hidden lg:min-h-[82vh]">
        <div className="absolute inset-0 -z-10">
          <Image
            src={series.coverUrl ?? series.posterUrl ?? FALLBACK_COVER_URL}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/82 to-background/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/65 to-transparent" />
          <div aria-hidden className="aurora-wash-soft absolute inset-x-0 bottom-0 h-80 opacity-45 blur-3xl" />
          <div className="absolute inset-0 shadow-[inset_0_-80px_120px_-40px_var(--background)]" />
        </div>

        <div className="mx-auto w-full max-w-[1600px] px-4 pt-20 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pt-28 lg:pb-20">
          <Link
            href="/movies?tab=series"
            className="focus-ring mb-7 inline-flex h-10 items-center gap-2 rounded-full bg-white/8 px-4 text-sm font-medium text-white/80 ring-1 ring-white/12 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/14 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {t.seriesDetail.backToSeries}
          </Link>

          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:gap-12">
            <div className="relative hidden aspect-2/3 w-52 shrink-0 overflow-hidden rounded-3xl ring-1 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)] ring-white/12 ring-inset lg:block xl:w-60">
              <Image src={series.posterUrl ?? FALLBACK_POSTER_URL} alt="" fill sizes="240px" className="object-cover" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur-md ring-inset">
                <Tv className="size-3.5" />
                {t.seriesDetail.seasonSummary(seasons.size, episodes?.length ?? 0)}
              </span>

              <h1 className="text-display max-w-3xl">{series.title}</h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="text-muted-foreground nums">{series.releaseYear}</span>
                <Dot />
                <span className="text-muted-foreground">{series.language}</span>
                <AccessBadge accessType={series.accessType} wording="full" />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {hasAccess ? (
                  firstEpisode ? (
                    <Button
                      variant="onArt"
                      size="pill"
                      render={<Link href={`/player/${firstEpisode.id}`} />}
                      nativeButton={false}
                    >
                      <Play className="size-4 fill-current" />
                      {t.seriesDetail.startWatching}
                    </Button>
                  ) : (
                    <span className="flex h-11 items-center gap-2 rounded-full bg-white/8 px-5 text-sm font-medium text-muted-foreground ring-1 ring-white/15 ring-inset">
                      <ListVideo className="size-4" />
                      {t.seriesDetail.noEpisodesTitle}
                    </span>
                  )
                ) : (
                  // The one subscribe surface for the whole show — individual episodes are never gated separately.
                  <Button
                    size="pill"
                    onClick={() => setSubscribeOpen(true)}
                  >
                    <Crown className="size-4" />
                    {t.movieDetail.subscribeToWatch}
                  </Button>
                )}
              </div>

              {hasAccess && series.accessType === "SUBSCRIPTION" && (
                <p className="text-xs text-muted-foreground">{t.seriesDetail.unlockedNote}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── THE SPINE ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1600px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <Surface padding="lg" className="min-w-0">
            <SectionHeader as="h2" kicker={series.genre} title={t.movieDetail.storyline} />
            <p className="text-body-muted mt-4 max-w-3xl leading-relaxed">{series.description}</p>

            {series.categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {series.categories.map((category) => (
                  <Chip key={category.id} tone="neutral" variant="outline">
                    {category.name}
                  </Chip>
                ))}
              </div>
            )}
          </Surface>

          <div className="flex h-fit flex-col gap-3">
            {/* The two counts a viewer actually asks a show ("how much is
                there?") get the big-number treatment; the rest are a fact list. */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={Layers} label={t.seriesDetail.seasons} value={seasons.size} />
              <StatTile icon={ListVideo} label={t.seriesDetail.episodes} value={episodes?.length ?? 0} />
            </div>

            <Surface tone="subtle" padding="md">
              <Kicker>{t.movieDetail.details}</Kicker>
              <dl className="mt-3 flex flex-col">
                <DetailRow
                  icon={CalendarDays}
                  label={t.movieDetail.releaseYear}
                  value={String(series.releaseYear)}
                  numeric
                />
                <DetailRow icon={Globe} label={t.movieDetail.language} value={series.language} />
                <DetailRow icon={Clapperboard} label={t.movieDetail.genre} value={series.genre} />
              </dl>
            </Surface>
          </div>
        </div>
      </section>

      {/* ── THE EPISODE LIST ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-10 w-full max-w-[1600px] px-4 pb-20 sm:px-6 lg:px-8 lg:mt-14">
        {seasons.size === 0 ? (
          <EmptyState
            icon={Tv}
            title={t.seriesDetail.noEpisodesTitle}
            description={t.seriesDetail.noEpisodesBody}
          />
        ) : (
          <>
            <SectionHeader
              as="h2"
              kicker={
                selectedSeason !== undefined ? t.seriesDetail.seasonLabel(selectedSeason) : undefined
              }
              title={t.seriesDetail.episodes}
              description={t.seriesDetail.seasonSummary(seasons.size, episodes?.length ?? 0)}
            />

            {/* One season at a time. Stacking every season made a long show an
                endless scroll with no way to jump. */}
            <div className="scrollbar-none mt-5 mb-5 flex items-center gap-2 overflow-x-auto pb-1">
              {seasonNumbers.map((number) => {
                const active = number === selectedSeason;
                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => setActiveSeason(number)}
                    aria-pressed={active}
                    className={chipClass({ tone: "mono", size: "lg", selected: active })}
                  >
                    {t.seriesDetail.seasonLabel(number)}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              {visibleEpisodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  hasAccess={hasAccess}
                  lockedLabel={t.seriesDetail.lockedEpisode}
                  fallbackTitle={t.seriesDetail.episodeFallbackTitle}
                  onLockedClick={() => setSubscribeOpen(true)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <CommentsSection titleId={series.id} />

      <div className="h-16" />

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </div>
  );
}

function EpisodeRow({
  episode,
  hasAccess,
  lockedLabel,
  fallbackTitle,
  onLockedClick,
}: {
  episode: Movie;
  hasAccess: boolean;
  lockedLabel: string;
  fallbackTitle: (episode: number) => string;
  onLockedClick: () => void;
}) {
  const title = episode.title || fallbackTitle(episode.episodeNumber ?? 0);

  const body = (
    <Surface
      tone="subtle"
      interactive={hasAccess}
      className={cn(
        "group/ep flex items-center gap-3 p-2.5 sm:gap-4 sm:p-3",
        hasAccess && "hover:ring-primary/35",
      )}
    >
      {/* The episode number as a standalone numeral: the fastest way to keep
          your place in a long season, and it survives long titles wrapping. */}
      <span className="hidden w-8 shrink-0 text-center font-heading text-lg font-bold text-muted-foreground nums transition-colors duration-200 ease-out group-hover/ep:text-foreground sm:block">
        {episode.episodeNumber ?? "—"}
      </span>

      {/* A 16:9 still rather than a number chip alone — it's the fastest way to
          tell episodes apart, and every episode already carries artwork. */}
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-white/8 ring-inset sm:w-40">
        <Image
          src={episode.coverUrl ?? episode.posterUrl ?? FALLBACK_COVER_URL}
          alt=""
          fill
          sizes="160px"
          className="object-cover transition-transform duration-500 ease-out group-hover/ep:scale-105"
        />
        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white nums backdrop-blur-sm sm:hidden">
          {episode.episodeNumber ?? "?"}
        </span>
        {hasAccess ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 ease-out group-hover/ep:opacity-100">
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-black shadow-e2">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="flex size-8 items-center justify-center rounded-full bg-black/60 text-premium ring-1 ring-premium/30 ring-inset">
              <Lock className="size-3.5" />
            </span>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span className="nums">{episode.duration > 0 ? formatDuration(episode.duration) : "—"}</span>
        </p>
        {episode.description && (
          <p className="mt-1.5 line-clamp-2 hidden text-xs text-muted-foreground sm:block">
            {episode.description}
          </p>
        )}
      </div>

      {/* Episodes never carry their own gate — access always comes from the parent series. */}
      {!hasAccess && (
        <Chip tone="premium" size="lg" className="mr-1 font-semibold">
          <Lock />
          <span className="hidden sm:inline">{lockedLabel}</span>
        </Chip>
      )}
    </Surface>
  );

  if (hasAccess) {
    return (
      <Link href={`/player/${episode.id}`} className="focus-ring rounded-2xl">
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onLockedClick} className="focus-ring rounded-2xl text-left">
      {body}
    </button>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />;
}

/** One fact in the details panel — label left, value right, hairline between. */
function DetailRow({
  icon: Icon,
  label,
  value,
  numeric = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/6 py-2.5 last:border-0">
      <dt className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className={cn("min-w-0 text-right text-sm font-medium", numeric && "nums")}>{value}</dd>
    </div>
  );
}

/** Mirrors the hero's shape so the page doesn't jump when the data lands. */
function SeriesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-28 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-12">
        <div className="hidden aspect-2/3 w-52 shrink-0 animate-pulse rounded-3xl bg-secondary/60 lg:block xl:w-60" />
        <div className="flex w-full flex-col gap-4">
          <div className="h-3 w-24 animate-pulse rounded bg-secondary/60" />
          <div className="h-12 w-3/4 animate-pulse rounded-lg bg-secondary/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-secondary/60" />
          <div className="h-12 w-64 animate-pulse rounded-full bg-secondary/60" />
        </div>
      </div>
      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="h-48 animate-pulse rounded-2xl bg-secondary/40" />
        <div className="hidden h-48 animate-pulse rounded-2xl bg-secondary/40 lg:block" />
      </div>
    </div>
  );
}
