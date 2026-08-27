"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, Search, X } from "lucide-react";

import { BookCard } from "./BookCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";
import { Chip, chipClass } from "@/components/system/Chip";
import { SectionHeader } from "@/components/system/SectionHeader";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/context/language-context";
import { BOOKS } from "@/lib/media/books-data";
import { cn } from "@/lib/utils";

/**
 * THE BOOKS PAGE — a digital bookstore, not a second movie grid.
 *
 * Opens on the Book of the Week: a lit editorial panel with the cover as a
 * physical object and room for a description — the one medium where blurb
 * text belongs. Below it, a shelf browser: category chips, a search over
 * titles and authors, and the airy BookCard grid.
 *
 * The whole shelf is a labeled preview (see lib/media/books-data): the header
 * carries a "coming soon" chip and a plain sentence saying these titles can't
 * be opened yet, so the page shows intent without pretending inventory.
 */
export function BooksView() {
  const { t } = useLanguage();
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const genres = useMemo(() => [...new Set(BOOKS.map((b) => b.genre))], []);
  const featured = BOOKS.find((b) => b.featured) ?? BOOKS[0];

  const query = term.trim().toLowerCase();
  const isNarrowed = query.length > 0 || genre !== null;
  const filtered = BOOKS.filter((book) => {
    if (genre && book.genre !== genre) return false;
    if (!query) return true;
    return (
      book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <h2 className="sr-only">{t.search.books}</h2>

      {/* ─ Book of the week — hidden the moment the user starts browsing ─ */}
      {!isNarrowed && (
        <section className="relative isolate mb-8 overflow-hidden rounded-3xl bg-card/50 p-5 ring-1 ring-white/10 ring-inset sm:p-8">
          <AuroraBackdrop variant="panel" className="opacity-70" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="relative w-32 shrink-0 self-start sm:w-40 sm:self-center">
              <div className="relative aspect-[5/7] overflow-hidden rounded-r-xl rounded-l-[4px] shadow-e3 ring-1 ring-white/12 ring-inset">
                <Image src={featured.coverUrl} alt="" fill priority sizes="160px" className="object-cover" />
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/50 via-white/15 to-transparent"
                />
                <div
                  aria-hidden
                  className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-l from-white/30 to-transparent"
                />
              </div>
              <div aria-hidden className="mx-3 -mt-1 h-2 rounded-[100%] bg-black/50 blur-[6px]" />
            </div>

            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-premium uppercase">
                <BookOpen className="size-3.5" />
                {t.media.bookOfTheWeek}
              </p>
              <h3 className="mt-2 font-heading text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
                {featured.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {featured.author}
                <span className="text-muted-foreground/40"> · </span>
                <span className="nums">{featured.releaseYear}</span>
              </p>
              <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {featured.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chip tone="neutral" variant="outline" size="sm">
                  {featured.genre}
                </Chip>
                <Chip tone="neutral" variant="outline" size="sm">
                  {featured.format}
                </Chip>
                <Chip tone="info" variant="soft" size="sm">
                  {t.media.comingSoon}
                </Chip>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─ The shelf browser ─ */}
      <SectionHeader
        kicker={t.search.books}
        title={t.media.newBooks}
        description={t.media.previewNote}
        action={
          <>
            <Chip tone="neutral" variant="outline" size="sm" className="nums">
              {t.media.bookCount(filtered.length)}
            </Chip>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setTerm("");
                }}
                placeholder={t.media.searchBooks}
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

      <div className="scrollbar-none -mx-1 mt-4 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setGenre(null)}
          aria-pressed={genre === null}
          className={chipClass({ tone: "mono", variant: "outline", selected: genre === null })}
        >
          {t.browse.allGenres}
        </button>
        {genres.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGenre(genre === option ? null : option)}
            aria-pressed={genre === option}
            className={chipClass({ tone: "mono", variant: "outline", selected: genre === option })}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t.media.noBooksTitle}
            description={t.browse.noMoviesBody}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
