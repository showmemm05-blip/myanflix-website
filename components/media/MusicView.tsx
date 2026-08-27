"use client";

import { useState } from "react";
import { Music, Search, X } from "lucide-react";

import { MusicCard, TrackRow } from "./MusicCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { Chip } from "@/components/system/Chip";
import { SectionHeader } from "@/components/system/SectionHeader";
import { Surface } from "@/components/system/Surface";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/context/language-context";
import { ALBUMS, TRACKS } from "@/lib/media/music-data";
import { cn } from "@/lib/utils";

/**
 * THE MUSIC PAGE — a listening room, not a poster wall.
 *
 * Two shapes no other medium here uses: a grid of square album sleeves
 * (MusicCard) and a numbered track list (TrackRow) with hover-to-play rows —
 * the two patterns streaming music taught everyone to read. One search field
 * narrows both at once.
 *
 * Like Books, the whole catalog is a labeled preview until the music backend
 * ships: the header says "coming soon" in plain words, and every play control
 * answers with the same honest toast.
 */
export function MusicView() {
  const { t } = useLanguage();
  const [term, setTerm] = useState("");

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
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <h2 className="sr-only">{t.search.music}</h2>

      <SectionHeader
        kicker={t.search.music}
        title={t.media.albums}
        description={t.media.previewNote}
        action={
          <>
            <Chip tone="info" variant="soft" size="sm">
              {t.media.comingSoon}
            </Chip>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setTerm("");
                }}
                placeholder={t.media.searchMusic}
                className={cn("h-9 w-56 rounded-full pl-10 sm:w-64", term ? "pr-9" : "pr-3")}
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  aria-label={t.browse.clearSearch}
                  className="focus-ring absolute top-1/2 right-1.5 flex size-6.5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-white/10 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </>
        }
      />

      {albums.length === 0 && tracks.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Music} title={t.media.noMusicTitle} description={t.browse.noMoviesBody} />
        </div>
      ) : (
        <>
          {albums.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {albums.map((album) => (
                <MusicCard key={album.id} album={album} />
              ))}
            </div>
          )}

          {tracks.length > 0 && (
            <section className="mt-10">
              <SectionHeader
                title={t.media.popularTracks}
                action={
                  <Chip tone="neutral" variant="outline" size="sm" className="nums">
                    {t.media.trackCount(tracks.length)}
                  </Chip>
                }
              />
              <Surface tone="subtle" className="mt-4 p-1.5 sm:p-2">
                <ol className="flex flex-col">
                  {tracks.map((track, index) => (
                    <TrackRow key={track.id} track={track} index={index} />
                  ))}
                </ol>
              </Surface>
            </section>
          )}
        </>
      )}
    </div>
  );
}
