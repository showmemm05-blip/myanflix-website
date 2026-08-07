"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { WatchHistoryEntry } from "@/types/movie";

export function ContinueWatchingCard({ entry, className }: { entry: WatchHistoryEntry; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn("group relative w-40 shrink-0 sm:w-44 lg:w-48", className)}
    >
      <Link href={`/player/${entry.movieId}`} className="block">
        <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-white/[0.08] bg-muted">
          <Image
            src={entry.posterUrl ?? FALLBACK_POSTER_URL}
            alt={entry.movieTitle}
            fill
            sizes="(max-width: 640px) 160px, 192px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/50 group-hover:opacity-100">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="size-4 fill-current" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6">
            <Progress value={entry.progressPercent} />
          </div>
        </div>
        <div className="mt-2">
          <p className="truncate text-sm font-medium text-foreground">{entry.movieTitle}</p>
          <p className="text-xs text-muted-foreground">
            {entry.durationMinutes ? formatDuration(entry.durationMinutes) : ""} &middot; {entry.progressPercent}%
            watched
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
