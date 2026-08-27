"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/lib/context/language-context";
import { formatTimecode } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MusicAlbum, MusicTrack } from "@/types/music";

/**
 * THE MUSIC CARD — square artwork, a play button that arrives on approach.
 *
 * The third distinct object in the media system: where MovieCard is a tall
 * poster and BookCard is a hardcover on a shelf, this is a record sleeve —
 * square art edge to edge, and a filled play disc that slides up from the
 * corner on hover the way every music platform has taught a hand to expect.
 * Title and artist sit under the sleeve as two quiet lines.
 *
 * Playback doesn't exist yet (the music backend is a labeled preview), so the
 * play button answers honestly with the "coming soon" toast instead of dying
 * silently or pretending to be a link.
 */
export function MusicCard({ album, className }: { album: MusicAlbum; className?: string }) {
  const { t } = useLanguage();

  return (
    <article className={cn("group/music flex min-w-0 flex-col", className)}>
      {/* ─ The sleeve ─ */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/60 shadow-e1 ring-1 ring-white/8 transition-[box-shadow] duration-200 ease-out ring-inset group-hover/music:shadow-e2 group-hover/music:ring-white/16">
        <Image
          src={album.artworkUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 23vw, 220px"
          className="object-cover transition-transform duration-500 ease-out group-hover/music:scale-[1.04]"
        />
        {/* Footlight for the play disc — only when it's on stage. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover/music:opacity-100 group-focus-within/music:opacity-100"
        />
        <button
          type="button"
          aria-label={t.browse.play}
          onClick={() => toast(t.media.comingSoon)}
          className={cn(
            "absolute right-2.5 bottom-2.5 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(0,0,0,0.45)]",
            "translate-y-2 opacity-0 transition-[opacity,transform] duration-200 ease-out",
            "group-hover/music:translate-y-0 group-hover/music:opacity-100",
            "focus-visible:translate-y-0 focus-visible:opacity-100",
            "hover:scale-105 active:scale-95",
          )}
        >
          <Play className="size-4 translate-x-px fill-current" />
        </button>
      </div>

      {/* ─ Two lines: what it is, who made it ─ */}
      <div className="min-w-0 px-0.5 pt-2.5">
        <h3 className="truncate text-sm leading-tight font-medium text-foreground transition-colors duration-150 ease-out group-hover/music:text-primary">
          {album.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {album.artist}
          <span className="text-muted-foreground/40"> · </span>
          <span className="nums">{album.releaseYear}</span>
        </p>
      </div>
    </article>
  );
}

/**
 * One row of the popular-tracks list — the pattern square cards can't cover:
 * an index that becomes a play button on hover, a thumbnail of the sleeve,
 * title/artist, the album (desktop only) and a tabular duration.
 */
export function TrackRow({ track, index }: { track: MusicTrack; index: number }) {
  const { t } = useLanguage();

  return (
    <li className="group/track flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150 ease-out hover:bg-white/6 sm:px-3">
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        <span className="text-xs text-muted-foreground transition-opacity duration-150 nums group-hover/track:opacity-0 group-focus-within/track:opacity-0">
          {index + 1}
        </span>
        <button
          type="button"
          aria-label={t.browse.play}
          onClick={() => toast(t.media.comingSoon)}
          className="focus-ring absolute inset-0 flex items-center justify-center rounded-full text-foreground opacity-0 transition-opacity duration-150 group-hover/track:opacity-100 focus-visible:opacity-100"
        >
          <Play className="size-3.5 fill-current" />
        </button>
      </span>

      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary/60 ring-1 ring-white/8 ring-inset">
        <Image src={track.artworkUrl} alt="" fill sizes="40px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>

      <span className="hidden w-44 shrink-0 truncate text-xs text-muted-foreground md:block">
        {track.album}
      </span>

      <span className="shrink-0 pl-2 text-xs text-muted-foreground nums">
        {formatTimecode(track.durationSeconds)}
      </span>
    </li>
  );
}
