import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatRelativeDate } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { WatchHistoryEntry } from "@/types/movie";

export function WatchHistoryCard({ entry }: { entry: WatchHistoryEntry }) {
  const isComplete = entry.progressPercent >= 95;
  return (
    <div className="glass-card flex gap-3 rounded-xl border-white/[0.08] p-3">
      <Link href={`/movie/${entry.movieId}`} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={entry.posterUrl ?? FALLBACK_POSTER_URL} alt={entry.movieTitle} fill sizes="80px" className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <Link href={`/movie/${entry.movieId}`} className="truncate text-sm font-semibold hover:text-primary">
            {entry.movieTitle}
          </Link>
          <p className="text-xs text-muted-foreground">Last watched {formatRelativeDate(entry.lastWatchedAt)}</p>
          <div className="mt-2 flex items-center gap-2">
            <Progress value={entry.progressPercent} className="h-1.5" />
            <span className="shrink-0 text-xs text-muted-foreground">
              {isComplete ? "Completed" : `${entry.progressPercent}%`}
            </span>
          </div>
        </div>
        <Button size="sm" className="w-fit" render={<Link href={`/player/${entry.movieId}`} />} nativeButton={false}>
          <Play className="size-3.5 fill-current" />
          {isComplete ? "Watch Again" : "Resume"}
        </Button>
      </div>
    </div>
  );
}
