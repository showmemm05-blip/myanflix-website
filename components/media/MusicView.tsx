"use client";

import { useState } from "react";
import Link from "next/link";
import { Music } from "lucide-react";

import { EmptyState } from "@/components/empty/EmptyState";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { ChevronDownIcon, CloseIcon, SearchIcon, Tag } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { ALBUMS, TRACKS } from "@/lib/media/music-data";
import { AlbumCard, TrackRow } from "./MusicCard";

/**
 * THE MUSIC PAGE (MediaMusic.dc.html) — /media/music.
 *
 * Music isn't playable yet, so the page says so up front: a "Coming soon"
 * hero (a vinyl record over an equaliser skyline, drawn on the page), then
 * the website's existing preview — album sleeves and the popular-tracks list
 * in one panel — with one "Search songs or artists" field narrowing both.
 * Every Play answers with the "isn't available yet" toast.
 */
export function MusicView() {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const [term, setTerm] = useState("");
  useTopBarOverHero();

  const query = term.trim().toLowerCase();
  const albums = ALBUMS.filter(
    (a) => !query || a.title.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query),
  );
  const tracks = TRACKS.filter(
    (tr) =>
      !query ||
      tr.title.toLowerCase().includes(query) ||
      tr.artist.toLowerCase().includes(query) ||
      tr.album.toLowerCase().includes(query),
  );

  return (
    <div className="mq-rise">
      <section
        aria-labelledby="h-music"
        className="under-bar relative isolate h-[clamp(520px,46vw,680px)] overflow-hidden bg-ground"
      >
        <MusicArt />
        <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />
        <div className="mq-rise absolute right-[45%] bottom-[clamp(40px,5vw,80px)] left-gutter max-w-[640px] max-desk:right-gutter">
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="bg-info/16 px-2 text-info">{m.comingSoonTag}</Tag>
            <span className="text-sm leading-5 font-semibold text-fg-body">{m.musicOnMyanflix}</span>
          </div>
          <h1 id="h-music" className="mt-3.5 text-display text-fg text-balance">
            {m.musicHeroTitle}
          </h1>
          <p className="mt-3.5 max-w-[52ch] text-[17px] leading-[27px] text-fg-body max-desk:text-[15px] max-desk:leading-6">
            {m.musicHeroBody}
          </p>
          <div className="mt-[26px] flex flex-wrap gap-3">
            <a href="#preview" className={buttonVariants({ variant: "tonal", size: "hero", className: "px-[22px] text-base font-bold" })}>
              <ChevronDownIcon size={20} />
              {m.seeWhatsComing}
            </a>
            <Link href="/media" className={buttonVariants({ variant: "tonal", size: "hero", className: "px-[22px] text-base font-bold" })}>
              {m.browseMovies}
            </Link>
          </div>
        </div>
      </section>

      <section
        id="preview"
        aria-labelledby="h-preview"
        className="scroll-mt-[calc(var(--shell-bar-h,124px)+16px)] px-gutter pt-2"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h2 id="h-preview" className="text-[clamp(26px,2.4vw,32px)] leading-[1.2] font-black tracking-[-0.02em] text-fg [&:lang(my)]:tracking-normal">
              {t.media.albums}
            </h2>
            <p className="mt-1 text-sm leading-5 text-fg-faint">{m.previewNote}</p>
          </div>
          <div className="relative w-[clamp(220px,22vw,300px)] max-desk:w-full">
            <label htmlFor="music-search" className="sr-only">
              {m.searchMusicLabel}
            </label>
            <SearchIcon size={18} className="pointer-events-none absolute top-[11px] left-4 text-fg-faint" />
            <input
              id="music-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setTerm("");
              }}
              placeholder={m.searchMusicPlaceholder}
              className="block h-10 w-full rounded-full border-0 bg-raised pr-[38px] pl-[42px] text-sm text-fg outline-none placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] [&::-webkit-search-cancel-button]:hidden"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                aria-label={t.browse.clearSearch}
                className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg outline-none hover:bg-tonal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {albums.length === 0 && tracks.length === 0 ? (
          <EmptyState
            icon={Music}
            title={t.media.noMusicTitle}
            description={m.noMusicBody}
            action={
              <Button variant="play" size="cta" onClick={() => setTerm("")}>
                {t.browse.clearSearch}
              </Button>
            }
          />
        ) : (
          <>
            {albums.length > 0 && (
              <div className="mt-[22px] grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-7 max-desk:grid-cols-3 max-desk:gap-x-2.5 max-desk:gap-y-4">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}

            {tracks.length > 0 && (
              <section aria-labelledby="h-tracks" className="mt-[clamp(40px,4vw,56px)]">
                <div className="flex items-baseline gap-3.5">
                  <h2 id="h-tracks" className="text-section-title text-fg">
                    {t.media.popularTracks}
                  </h2>
                  <span className="text-sm leading-5 text-fg-faint tabular-nums">{t.media.trackCount(tracks.length)}</span>
                </div>
                <ol className="mt-4 grid list-none grid-cols-2 gap-x-6 rounded-[16px] bg-surface p-2 max-desk:grid-cols-1">
                  {tracks.map((track, index) => (
                    <TrackRow key={track.id} track={track} index={index} />
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** The hero art: a vinyl record over an equaliser skyline, in the info blue. */
function MusicArt() {
  const bars = [120, 190, 150, 260, 210, 300, 240, 180, 280, 220, 160, 250, 200, 140, 230, 170, 270, 190, 130, 210];
  return (
    <svg
      aria-hidden
      focusable={false}
      className="absolute inset-0 size-full"
      viewBox="0 0 1440 810"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="1440" height="810" fill="var(--mq-surface)" />
      <rect width="1440" height="810" fill="var(--mq-info)" opacity="0.06" />
      <circle cx="1010" cy="330" r="300" fill="var(--mq-info)" opacity="0.08" />
      <g>
        <circle cx="1010" cy="330" r="230" fill="var(--mq-ground)" />
        {[210, 186, 162, 138, 114].map((r) => (
          <circle key={r} cx="1010" cy="330" r={r} fill="none" stroke="var(--mq-fg)" strokeOpacity="0.06" strokeWidth="2" />
        ))}
        <circle cx="1010" cy="330" r="78" fill="var(--mq-info)" />
        <circle cx="1010" cy="330" r="10" fill="var(--mq-ground)" />
      </g>
      <g fill="var(--mq-info)" fillOpacity="0.18">
        {bars.map((h, i) => (
          <rect key={i} x={i * 74} y={810 - h} width="58" height={h} rx="6" />
        ))}
      </g>
    </svg>
  );
}
