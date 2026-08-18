"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Crown,
  Film,
  Globe,
  Play,
  Plus,
  Share2,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosterRail } from "@/components/browse/PosterRail";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { EmptyState } from "@/components/empty/EmptyState";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { AccessBadge, Chip, Kicker, SectionHeader, Surface } from "@/components/system";
import { useQuery } from "@tanstack/react-query";
import { useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { seriesService } from "@/services/api/seriesService";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL, FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { data: movie, isLoading } = useMovie(id);
  const { data: similarMovies, isLoading: isSimilarLoading } = useSimilarMovies(id);
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();

  // An episode's access is always governed by its parent series' own
  // accessType, never its own — this page must never gate an episode on
  // anything but the series it belongs to.
  const { data: parentSeries } = useQuery({
    queryKey: ["series", movie?.seriesId],
    queryFn: () => seriesService.getSeriesById(movie!.seriesId!),
    enabled: Boolean(movie?.seriesId),
  });

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (!movie) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={Film}
          title={t.movieDetail.notFoundTitle}
          description={t.movieDetail.notFoundBody}
          action={
            <Button render={<Link href="/movies?tab=movies" />} nativeButton={false}>
              {t.movieDetail.backToMovies}
            </Button>
          }
        />
      </div>
    );
  }

  const accessType = movie.seriesId ? parentSeries?.accessType : movie.accessType;
  const hasAccess = accessType === "FREE" || isSubscribed;
  const inWatchlist = isInWatchlist(movie.id);
  const similarItems = (similarMovies ?? []).map((m) => movieToBrowseItem(m, formatDuration(m.duration)));

  return (
    <div className="flex flex-col">
      {/* ── THE STAGE ──────────────────────────────────────────────────────
          The artwork is the page, not a banner above it: the backdrop runs the
          full height of the hero, three gradient passes hold the type side, and
          an aurora blush at the bottom edge dissolves the picture into the
          content spine instead of ending it on a hard line. */}
      <section className="relative isolate flex min-h-[74vh] flex-col justify-end overflow-hidden lg:min-h-[82vh]">
        <div className="absolute inset-0 -z-10">
          <Image
            src={movie.coverUrl ?? movie.posterUrl ?? FALLBACK_COVER_URL}
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
            href="/movies?tab=movies"
            className="focus-ring mb-7 inline-flex h-10 items-center gap-2 rounded-full bg-white/8 px-4 text-sm font-medium text-white/80 ring-1 ring-white/12 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/14 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {t.movieDetail.backToMovies}
          </Link>

          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:gap-12">
            {/* Poster is desktop-only: on a phone the backdrop already carries
                the artwork, and a second copy just pushes the buttons off-screen. */}
            <div className="relative hidden aspect-2/3 w-52 shrink-0 overflow-hidden rounded-3xl ring-1 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)] ring-white/12 ring-inset lg:block xl:w-60">
              <Image
                src={movie.posterUrl ?? FALLBACK_POSTER_URL}
                alt=""
                fill
                sizes="240px"
                className="object-cover"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5">
              {/* The eyebrow slot: a live link back to the show for an episode,
                  a plain kicker for a standalone film. */}
              {movie.seriesId && parentSeries ? (
                <Link
                  href={`/series/${movie.seriesId}`}
                  className="focus-ring inline-flex w-fit items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/15"
                >
                  <Tv className="size-3.5" />
                  {parentSeries.title}
                  {movie.seasonNumber !== null && movie.episodeNumber !== null && (
                    <span className="text-white/55">
                      · {t.player.meta.seasonEpisode(movie.seasonNumber, movie.episodeNumber)}
                    </span>
                  )}
                </Link>
              ) : (
                <Kicker>{t.nav.movies}</Kicker>
              )}

              <h1 className="text-display max-w-3xl">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <Chip tone="premium" className="font-semibold">
                  <Star className="fill-current" />
                  <span className="nums">{movie.rating.toFixed(1)}</span>
                </Chip>
                <span className="text-muted-foreground nums">{movie.releaseYear}</span>
                <Dot />
                <span className="text-muted-foreground nums">{formatDuration(movie.duration)}</span>
                <Dot />
                <span className="text-muted-foreground">{movie.language}</span>
                {accessType && <AccessBadge accessType={accessType} wording="full" />}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {hasAccess ? (
                  <Button
                    variant="onArt"
                    size="pill"
                    render={<Link href={`/player/${movie.id}`} />}
                    nativeButton={false}
                  >
                    <Play className="size-4 fill-current" />
                    {t.movieDetail.watchNow}
                  </Button>
                ) : (
                  <Button
                    size="pill"
                    onClick={() => setSubscribeOpen(true)}
                  >
                    <Crown className="size-4" />
                    {t.movieDetail.subscribeToWatch}
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => toggleWatchlist(movie.id)}
                  aria-pressed={inWatchlist}
                  className={cn(
                    "focus-ring flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ring-1 backdrop-blur-md transition-colors duration-150 ease-out ring-inset",
                    inWatchlist
                      ? "bg-primary/20 text-foreground ring-primary/50"
                      : "bg-white/8 text-white ring-white/20 hover:bg-white/15",
                  )}
                >
                  {inWatchlist ? <Check className="size-4" /> : <Plus className="size-4" />}
                  {inWatchlist ? t.movieDetail.inWatchlist : t.movieDetail.watchlist}
                </button>

                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  aria-label={t.movieDetail.share}
                  className="focus-ring flex size-11 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/20 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-white/15"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE SPINE ──────────────────────────────────────────────────────
          One idea per region: the story on the left, the hard facts in their
          own panel on the right, so neither has to interrupt the other. */}
      <section className="mx-auto w-full max-w-[1600px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <Surface padding="lg" className="min-w-0">
            <SectionHeader as="h2" kicker={movie.genre} title={t.movieDetail.storyline} />
            <p className="text-body-muted mt-4 max-w-3xl leading-relaxed">{movie.description}</p>

            {movie.categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {movie.categories.map((category) => (
                  <Chip key={category.id} tone="neutral" variant="outline">
                    {category.name}
                  </Chip>
                ))}
              </div>
            )}
          </Surface>

          <Surface tone="subtle" padding="md" className="h-fit">
            <Kicker>{t.movieDetail.details}</Kicker>
            <dl className="mt-3 flex flex-col">
              <DetailRow
                icon={CalendarDays}
                label={t.movieDetail.releaseYear}
                value={String(movie.releaseYear)}
                numeric
              />
              <DetailRow icon={Globe} label={t.movieDetail.language} value={movie.language} />
              <DetailRow icon={Film} label={t.movieDetail.genre} value={movie.genre} />
              {movie.categories.length > 0 && (
                <DetailRow
                  icon={Tv}
                  label={t.movieDetail.categories}
                  value={movie.categories.map((category) => category.name).join(", ")}
                />
              )}
            </dl>
          </Surface>
        </div>
      </section>

      {similarItems.length > 0 || isSimilarLoading ? (
        <div className="mt-12">
          <PosterRail title={t.movieDetail.similar} items={similarItems} isLoading={isSimilarLoading} />
        </div>
      ) : null}

      <CommentsSection titleId={movie.id} />

      <div className="h-16" />

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={movie.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
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
function DetailSkeleton() {
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
