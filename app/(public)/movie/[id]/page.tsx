"use client";

import { use, useId, useState } from "react";
import Link from "next/link";
import { Film, LogIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { AGE_RATING_LABELS } from "@/components/filters/filter-types";
import {
  CheckIcon,
  CrownIcon,
  HeroMeta,
  HeroTags,
  HeroTitle,
  MediaCard,
  PlayIcon,
  PlusIcon,
  Rating,
  Row,
  RowSkeleton,
  ShareIcon,
  Tag,
  filterChipClass,
} from "@/components/system";
import { useContinueWatching, useMovie, useSimilarMovies } from "@/hooks/use-movies";
import { useAuth } from "@/lib/context/auth-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { titlesText } from "@/lib/i18n/sections/titles";
import { seriesService } from "@/services/api/seriesService";
import { loginHref } from "@/lib/auth/return-to";
import { formatDuration } from "@/lib/format";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import { cn } from "@/lib/utils";
import { DetailHero, HeroChips, HeroProgress, HeroSynopsisToggle } from "../_detail/DetailHero";
import {
  CastRow,
  DetailColumns,
  DetailsPanel,
  TitleNotFound,
  TitleSkeleton,
  UpsellPanel,
  type CastPerson,
  type DetailFact,
} from "../_detail/DetailPanels";

const MOVIES_HREF = "/media/movies?tab=movies";

/** A catalog link filtered to one value of one facet (the catalog reads these params on load). */
function catalogHref(param: "genres" | "actorIds" | "directors", value: string) {
  return `${MOVIES_HREF}&${param}=${encodeURIComponent(value)}`;
}

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const shell = useSection(shellText);
  const titleId = useId();
  const { data: movie, isLoading } = useMovie(id);
  const { data: similarMovies, isLoading: isSimilarLoading } = useSimilarMovies(id, { genre: movie?.genre });
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  // The same in-progress history the Home "Continue watching" row reads
  // (shared cache key) — it is what turns Play into Resume here.
  const { data: inProgress } = useContinueWatching(isAuthenticated);

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

  if (isLoading) return <TitleSkeleton kind="title" label={s.loadingTitle} />;

  if (!movie) {
    return (
      <TitleNotFound
        icon={<Film className="size-7" strokeWidth={1.75} />}
        title={t.movieDetail.notFoundTitle}
        body={t.movieDetail.notFoundBody}
        backHref={MOVIES_HREF}
        backLabel={t.movieDetail.backToMovies}
      />
    );
  }

  const accessType = movie.seriesId ? parentSeries?.accessType : movie.accessType;
  const hasAccess = accessType === "FREE" || isSubscribed;
  // A guest can read the page but never watch — the CTA becomes "Sign in"
  // whatever the access type, and the subscribe dialog (whose own queries
  // need a session) never opens. Settled auth only, so a returning member's
  // profile load doesn't flash the guest button first.
  const isGuest = !isAuthenticated && !isAuthLoading;
  const canWatch = !isGuest && !isAuthLoading && hasAccess;
  const inWatchlist = isInWatchlist(movie.id);
  const similarItems = (similarMovies ?? []).map((m) => movieToBrowseItem(m, formatDuration(m.duration)));
  // null when the runtime was never measured — the meta line skips it.
  const runtime = formatDuration(movie.duration);
  const premium = accessType === "SUBSCRIPTION";

  // Resume: a started, unfinished entry for this film in the viewer's history.
  const progress = canWatch ? (inProgress ?? []).find((entry) => entry.movieId === movie.id) : undefined;
  const resuming = Boolean(progress && progress.progressPercent > 0 && progress.progressPercent < RESUME_COMPLETE_PERCENT);
  const playHref = progress && resuming
    ? resumeHref(movie.id, progress.progressPercent, progress.lastPositionSeconds)
    : `/player/${movie.id}`;
  const watchedLine = (() => {
    if (!progress) return "";
    // Same rounding and "unknown" rule as formatDuration, but the units are
    // written in the viewer's language, because they sit inside a sentence.
    const spoken = (minutes: number) => {
      if (formatDuration(minutes) === null) return null;
      const whole = Math.round(minutes);
      return s.hoursMinutes(Math.floor(whole / 60), whole % 60);
    };
    const watched = spoken(progress.lastPositionSeconds / 60);
    const left = movie.duration > 0 ? spoken(movie.duration - progress.lastPositionSeconds / 60) : null;
    return watched && left ? s.positionLeft(watched, left) : shell.percentWatched(progress.progressPercent);
  })();

  const people: CastPerson[] = [
    ...(movie.director
      ? [{ key: `director:${movie.director}`, name: movie.director, role: s.director, imageUrl: null, href: catalogHref("directors", movie.director) }]
      : []),
    ...movie.actors.map((actor) => ({
      key: actor.id,
      name: actor.name,
      role: s.actor,
      imageUrl: actor.imageUrl,
      href: catalogHref("actorIds", actor.id),
    })),
  ];
  const crewLine = movie.director
    ? s.crewLine(s.directorCount(1), t.movieDetail.castCount(movie.actors.length))
    : t.movieDetail.castCount(movie.actors.length);

  const facts: DetailFact[] = [
    { label: t.movieDetail.genre, value: movie.genre },
    ...(movie.categories.length > 0
      ? [{ label: t.movieDetail.categories, value: movie.categories.map((c) => c.name).join(", ") }]
      : []),
    { label: t.movieDetail.language, value: movie.language },
    { label: t.movieDetail.releaseYear, value: String(movie.releaseYear) },
    ...(runtime ? [{ label: s.length, value: runtime }] : []),
    ...(movie.director ? [{ label: s.director, value: movie.director }] : []),
    ...(movie.country ? [{ label: s.country, value: movie.country }] : []),
    ...(movie.ageRating ? [{ label: s.ageRatingLabel, value: AGE_RATING_LABELS[movie.ageRating] }] : []),
    ...(accessType
      ? [{ label: s.access, value: premium ? t.badges.premium : t.badges.free, tone: premium ? ("gold" as const) : ("money" as const) }]
      : []),
  ];

  return (
    <div className="flex flex-col">
      <DetailHero
        imageUrl={movie.coverUrl ?? movie.posterUrl}
        seed={movie.title}
        backHref={MOVIES_HREF}
        backLabel={t.movieDetail.backToMovies}
        titleId={titleId}
      >
        <HeroTags>
          {accessType &&
            (premium ? <Tag kind="premium">{shell.premiumTag}</Tag> : <Tag kind="free">{shell.freeTag}</Tag>)}
          {/* The eyebrow slot: a live link back to the show for an episode,
              a plain "Film" label for a standalone film. */}
          {movie.seriesId && parentSeries ? (
            <Link href={`/series/${movie.seriesId}`} className={cn(filterChipClass({ onArt: true }), "h-[26px] px-3 text-[13px]")}>
              {parentSeries.title}
              {movie.seasonNumber !== null && movie.episodeNumber !== null && (
                <span className="font-semibold text-fg-muted">
                  · {t.player.meta.seasonEpisode(movie.seasonNumber, movie.episodeNumber)}
                </span>
              )}
            </Link>
          ) : (
            <span className="text-sm leading-5 font-semibold text-fg-body">{s.film}</span>
          )}
        </HeroTags>

        <HeroTitle className="max-w-3xl">
          <span id={titleId}>{movie.title}</span>
        </HeroTitle>

        <HeroMeta>
          {movie.rating > 0 && (
            <span>
              <span className="sr-only">{s.rated(movie.rating.toFixed(1))}</span>
              <span aria-hidden>
                <Rating value={movie.rating} size="lg" />
              </span>
            </span>
          )}
          <span>{movie.releaseYear}</span>
          {runtime && <span>{runtime}</span>}
          <span>{movie.language}</span>
          {movie.ageRating && (
            <Tag kind="age">
              <span className="sr-only">{s.ageRating(AGE_RATING_LABELS[movie.ageRating])}</span>
              <span aria-hidden>{AGE_RATING_LABELS[movie.ageRating]}</span>
            </Tag>
          )}
        </HeroMeta>

        <HeroChips
          label={s.genreAndCategories}
          chips={[
            { key: `genre:${movie.genre}`, label: movie.genre, href: catalogHref("genres", movie.genre) },
            ...movie.categories
              .filter((category) => category.name !== movie.genre)
              .map((category) => ({ key: category.id, label: category.name })),
          ]}
        />

        {movie.description && <HeroSynopsisToggle>{movie.description}</HeroSynopsisToggle>}

        <div className="mt-6 flex flex-wrap gap-3">
          {isAuthLoading ? (
            // Auth is still settling: hold the slot so neither "Play" nor
            // "Sign in" flashes before we know who is looking.
            <span aria-hidden className="mq-skeleton block h-[52px] w-40 rounded-[12px]" />
          ) : isGuest ? (
            <Link href={loginHref(`/movie/${movie.id}`)} className={buttonVariants({ variant: "play", size: "hero" })}>
              <LogIn aria-hidden strokeWidth={1.75} />
              {t.movieDetail.signInToWatch}
            </Link>
          ) : hasAccess ? (
            <Link
              href={playHref}
              aria-label={resuming && progress ? shell.resume(movie.title, progress.progressPercent) : s.playTitle(movie.title)}
              className={buttonVariants({ variant: "play", size: "hero" })}
            >
              <PlayIcon />
              {resuming ? s.resume : s.play}
            </Link>
          ) : (
            <Button variant="gold" size="hero" className="px-6" aria-haspopup="dialog" onClick={() => setSubscribeOpen(true)}>
              <CrownIcon size={17} />
              {t.movieDetail.subscribeToWatch}
            </Button>
          )}

          <Button
            variant="tonal"
            size="hero"
            className="px-[22px] text-base font-bold"
            aria-pressed={inWatchlist}
            onClick={() => toggleWatchlist(movie.id)}
          >
            {inWatchlist ? <CheckIcon className="text-link" strokeWidth={2.4} /> : <PlusIcon />}
            {inWatchlist ? s.inMyList : shell.myList}
          </Button>

          <Button
            variant="tonal"
            size="icon-hero"
            aria-haspopup="dialog"
            aria-label={s.share(movie.title)}
            onClick={() => setShareOpen(true)}
          >
            <ShareIcon size={22} />
          </Button>
        </div>

        {canWatch && resuming && progress && (
          <HeroProgress percent={progress.progressPercent} label={s.watched} caption={watchedLine} />
        )}
        {canWatch && !resuming && premium && (
          <p className="mt-4 flex items-center gap-2 text-sm leading-5 font-semibold text-gold">
            <CrownIcon size={11} />
            {s.includedWithPlan}
          </p>
        )}
      </DetailHero>

      <div className="mt-8 flex flex-col gap-[clamp(36px,3.4vw,52px)]">
        {/* Who is in this film is a fact about the film, so the cast comes
            before the pivot to other titles. Renders nothing with no cast. */}
        <CastRow title={s.castAndCrew} subtitle={crewLine} people={people} />

        {isSimilarLoading ? (
          <RowSkeleton kind="poster" />
        ) : similarItems.length > 0 ? (
          <Row
            title={t.movieDetail.similar}
            seeAllHref={catalogHref("genres", movie.genre)}
          >
            {similarItems.map((item) => (
              <MediaCard key={item.id} item={item} layout="rail" sizes="(max-width: 719px) 33vw, 184px" />
            ))}
          </Row>
        ) : null}

        <DetailColumns
          className="mt-3"
          asideLabel={s.aboutFilm}
          aside={
            <>
              <DetailsPanel facts={facts} />
              {!isGuest && !isAuthLoading && !hasAccess && (
                <UpsellPanel title={movie.title} onSeePlans={() => setSubscribeOpen(true)} />
              )}
            </>
          }
        >
          <CommentsSection movieId={movie.id} className="max-w-[820px]" />
        </DetailColumns>
      </div>

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
