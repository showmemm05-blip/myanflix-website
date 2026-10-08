"use client";

import { toast } from "sonner";

import { FallbackArt, PlayIcon } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";
import { formatTimecode } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import type { MusicAlbum, MusicTrack } from "@/types/music";

/**
 * MUSIC PREVIEW CARDS (MediaMusic.dc.html).
 *
 * The square album sleeve and the numbered track row. Music is still a
 * labelled preview, so the sleeve art is drawn on the page (never a remote
 * placeholder) and every Play answers with the same honest "isn't available
 * yet" toast instead of dying silently or pretending to be a link.
 */
function useNotPlayable() {
  const { t } = useLanguage();
  return () => toast(t.search.musicComingSoon);
}

export function AlbumCard({ album }: { album: MusicAlbum }) {
  const m = useSection(mediaText);
  const notPlayable = useNotPlayable();

  return (
    <article className="group/card relative min-w-0">
      <span className="relative block aspect-square overflow-hidden rounded-[10px] bg-raised">
        <FallbackArt
          seed={album.title}
          variant="poster"
          className="transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]"
        />
        <span
          aria-hidden
          className="absolute right-2.5 bottom-2.5 left-2.5 line-clamp-2 text-[13px] leading-[14px] font-black tracking-[-0.01em] text-white uppercase"
        >
          {album.title}
        </span>
      </span>
      <span className="mt-2.5 block truncate text-[15px] leading-5 font-bold text-fg transition-colors duration-150 group-hover/card:text-link">
        {album.title}
      </span>
      <span className="block truncate text-[13px] leading-[18px] text-fg-faint tabular-nums">
        {m.albumMeta(album.artist, album.releaseYear)}
      </span>
      {/* Visible on hover / keyboard focus with a pointer; always reachable on touch. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex aspect-square items-center justify-center">
        <button
          type="button"
          aria-label={m.playAlbum(album.title)}
          onClick={notPlayable}
          className="pointer-events-auto flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-play text-ink transition-opacity duration-200 outline-none group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover-device:opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.97]"
        >
          <PlayIcon size={20} />
        </button>
      </span>
    </article>
  );
}

export function TrackRow({ track, index }: { track: MusicTrack; index: number }) {
  const m = useSection(mediaText);
  const notPlayable = useNotPlayable();

  return (
    <li className="flex min-h-16 items-center gap-3.5 rounded-[10px] px-2.5 py-2 transition-colors duration-150 hover:bg-raised">
      <span aria-hidden className="w-6 shrink-0 text-right text-sm font-bold text-fg-faint tabular-nums">
        {index + 1}
      </span>
      <span aria-hidden className="relative size-11 shrink-0 overflow-hidden rounded-[6px]">
        <FallbackArt seed={track.album} variant="poster" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-5 font-bold text-fg">{track.title}</span>
        <span className="block truncate text-[13px] leading-[18px] text-fg-faint">{m.trackSub(track.artist, track.album)}</span>
      </span>
      <span className="shrink-0 text-[13px] text-fg-faint tabular-nums">{formatTimecode(track.durationSeconds)}</span>
      <button
        type="button"
        aria-label={m.playTrack(track.title, track.artist)}
        onClick={notPlayable}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg transition-colors duration-150 outline-none hover:bg-tonal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        <PlayIcon size={18} />
      </button>
    </li>
  );
}
