"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Search, X } from "lucide-react";

import { BookCard } from "./BookCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";
import { Chip, chipClass } from "@/components/system/Chip";
import { SectionHeader } from "@/components/system/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/context/language-context";
import { useBooks } from "@/hooks/use-books";
import { useSearchTerm } from "@/hooks/use-search-term";
import { cn } from "@/lib/utils";

const FALLBACK_COVER = "https://picsum.photos/seed/myanflix-book/480/672";

/**
 * THE BOOKS PAGE — a digital bookstore, not a second movie grid.
 *
 * Opens on the Book of the Week: a lit editorial panel with the cover as a
 * physical object and room for a description — the one medium where blurb
 * text belongs. Below it, a shelf browser: category chips, a search over
 * titles and authors, and the airy BookCard grid.
 *
 * Search runs on the server (the same `search` param the movies catalog
 * uses, debounced) while the category chips filter the fetched page, because
 * the whole published library is small enough to hold and re-chipping should
 * be instant.
 */
export function BooksView() {
  const { t } = useLanguage();
  // The app's one search-timing policy — debounce, minimum length and stale
  // window all live in useSearchTerm, so the shelf searches exactly the way
  // the movies catalog does.
  const { term, setTerm, effectiveTerm, clear } = useSearchTerm();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data, isLoading } = useBooks({
    limit: 60,
    search: effectiveTerm || undefined,
  });

  const books = useMemo(() => data?.items ?? [], [data]);

  // Categories come from what is actually on the shelf, so a chip can never
  // lead to an empty result.
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const book of books) {
      for (const c of book.categories) seen.set(c.id, c.name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [books]);

  const isNarrowed = term.trim().length > 0 || categoryId !== null;
  const filtered = categoryId
    ? books.filter((b) => b.categories.some((c) => c.id === categoryId))
    : books;

  // The most recently published book carries the editorial slot — the
  // backend has no "featured" flag, and newest-first is what a shop window
  // means anyway.
  const featured = books[0];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <h2 className="sr-only">{t.search.books}</h2>

      {/* ─ Book of the week — hidden the moment the user starts browsing ─ */}
      {!isNarrowed && featured && (
        <section className="relative isolate mb-8 overflow-hidden rounded-3xl bg-card/50 p-5 ring-1 ring-white/10 ring-inset sm:p-8">
          <AuroraBackdrop variant="panel" className="opacity-70" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="relative w-32 shrink-0 self-start sm:w-40 sm:self-center">
              <div className="relative aspect-[5/7] overflow-hidden rounded-r-xl rounded-l-[4px] shadow-e3 ring-1 ring-white/12 ring-inset">
                <Image
                  src={featured.coverUrl ?? FALLBACK_COVER}
                  alt=""
                  fill
                  priority
                  sizes="160px"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/50 via-white/15 to-transparent"
                />
                <div
                  aria-hidden
                  className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-l from-white/30 to-transparent"
                />
              </div>
              <div
                aria-hidden
                className="mx-3 -mt-1 h-2 rounded-[100%] bg-black/50 blur-[6px]"
              />
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
                {t.book.byAuthor(featured.author)}
              </p>
              <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {featured.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {featured.categories.slice(0, 2).map((c) => (
                  <Chip key={c.id} tone="neutral" variant="outline" size="sm">
                    {c.name}
                  </Chip>
                ))}
                <Chip tone="neutral" variant="outline" size="sm">
                  {/* Counts live on the edition now; a card shows the first
                      published language's, which is the one it links into.
                      The chapter is the unit for BOTH kinds of book — a
                      scanned title is serialised chapter by chapter too. */}
                  {t.book.chapterCount(featured.editions[0]?.chapterCount ?? 0)}
                </Chip>
              </div>
              <Button
                render={<Link href={`/books/${featured.id}`} />}
                nativeButton={false}
                className="mt-5"
              >
                <BookOpen className="size-4" />
                {t.book.read}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─ The shelf browser ─ */}
      <SectionHeader
        kicker={t.search.books}
        title={t.media.newBooks}
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
                  if (e.key === "Escape") clear();
                }}
                placeholder={t.media.searchBooks}
                className={cn(
                  "h-9 w-56 rounded-full pl-10 sm:w-64",
                  term ? "pr-9" : "pr-3",
                )}
              />
              {term && (
                <button
                  type="button"
                  onClick={clear}
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

      {categories.length > 0 && (
        <div className="scrollbar-none -mx-1 mt-4 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            aria-pressed={categoryId === null}
            className={chipClass({
              tone: "mono",
              variant: "outline",
              selected: categoryId === null,
            })}
          >
            {t.media.allBookTypes}
          </button>
          {categories.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                setCategoryId(categoryId === option.id ? null : option.id)
              }
              aria-pressed={categoryId === option.id}
              className={chipClass({
                tone: "mono",
                variant: "outline",
                selected: categoryId === option.id,
              })}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex flex-col">
                <Skeleton className="aspect-[5/7] w-full rounded-r-lg rounded-l-[4px]" />
                <Skeleton className="mt-3 h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={isNarrowed ? t.media.noBooksTitle : t.media.emptyLibraryTitle}
            description={
              isNarrowed ? t.media.noBooksBody : t.media.emptyLibraryBody
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((book, index) => (
              <BookCard key={book.id} book={book} priority={index < 6} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
