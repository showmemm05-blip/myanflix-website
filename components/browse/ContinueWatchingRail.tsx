"use client";

import { LandscapeCard } from "@/components/cards/LandscapeCard";
import { Row, RowSkeleton } from "@/components/system/Row";
import { useContinueWatching } from "@/hooks/use-movies";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { shellText } from "@/lib/i18n/sections/shell";
import { resumeHref } from "@/lib/player/resume";

/**
 * CONTINUE WATCHING — wide 16:9 cards (owner decision), each with the red
 * progress line along the foot of the art, "2h 4m · 38% watched" under it,
 * and the whole card resuming playback at the saved second.
 *
 * Behaviour as before: signed-in viewers only, entries between 1% and 95%
 * watched (the hook filters), nothing at all when there's nothing to resume.
 * "See all" opens the watch history.
 */
export function ContinueWatchingRail({ className }: { className?: string }) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useContinueWatching(isAuthenticated);

  if (!isAuthenticated) return null;
  if (isLoading) return <RowSkeleton kind="landscape" className={className} />;
  const entries = data ?? [];
  if (entries.length === 0) return null;

  return (
    <Row
      title={sx.continueTitle}
      subtitle={sx.continueSub}
      seeAllHref="/watch-history"
      seeAllLabel={s.seeAll}
      className={className}
    >
      {entries.map((entry) => {
        const progress = Math.min(100, Math.max(0, entry.progressPercent));
        const runtime = entry.durationMinutes ? formatDuration(entry.durationMinutes) : null;
        const watched = t.watchHistory.percentWatched(entry.progressPercent);
        return (
          <LandscapeCard
            key={entry.id}
            layout="rail"
            title={entry.movieTitle}
            href={resumeHref(entry.movieId, entry.progressPercent, entry.lastPositionSeconds)}
            imageUrl={entry.posterUrl}
            progress={progress}
            meta={runtime ? `${runtime} · ${watched}` : watched}
            a11yLabel={s.resume(entry.movieTitle, Math.round(progress))}
          />
        );
      })}
    </Row>
  );
}
