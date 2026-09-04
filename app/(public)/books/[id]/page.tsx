"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  FileText,
  Layers,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { Chip, Kicker } from "@/components/system";
import { LanguagePanel } from "@/components/books/LanguagePanel";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import {
  useBook,
  useBookChapters,
  useBookContents,
  useReadingProgress,
} from "@/hooks/use-books";
import {
  languageLabel,
  loadPreferredLanguage,
  pickEdition,
  savePreferredLanguage,
} from "@/lib/books/languages";
import { cn } from "@/lib/utils";
import { hasMyanmar } from "@/components/books/reader-settings";
import type {
  BookChapterSummary,
  BookEdition,
  BookSectionSummary,
} from "@/types/book";

const FALLBACK_COVER = "https://picsum.photos/seed/myanflix-book/480/672";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="text-right text-sm font-medium nums">{value}</span>
    </div>
  );
}

/**
 * THE BOOK DETAIL PAGE.
 *
 * A title band over its own cover art, then the contents on the left and the
 * facts about the edition on the right — the shape a serialised-fiction site
 * uses, because it answers the two questions a reader actually arrives with:
 * "what language can I read this in" and "where do I start".
 *
 * Language is the organising axis, not a setting: chapters, pages and the
 * bookmark all belong to one edition, so choosing a language re-points the
 * whole page rather than filtering it.
 */
export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthed = Boolean(user);

  const { data: book, isLoading } = useBook(id);

  const [editionId, setEditionId] = useState<string | null>(null);
  const [ascending, setAscending] = useState(true);

  // Resolve the language once the book arrives: the reader's standing
  // preference if this title has it, otherwise whatever it does have.
  useEffect(() => {
    if (!book || editionId) return;
    const chosen = pickEdition(book.editions, loadPreferredLanguage());
    if (chosen) setEditionId(chosen.id);
  }, [book, editionId]);

  const edition = useMemo(
    () => book?.editions.find((e) => e.id === editionId) ?? null,
    [book, editionId],
  );

  const selectLanguage = (next: BookEdition) => {
    setEditionId(next.id);
    savePreferredLanguage(next.language);
  };

  const isWritten = book?.type === "EDITOR";
  // The chapter is the unit of content for BOTH types now: a written chapter
  // holds its text, a scanned one holds its own release of pages. So there is
  // one list, and the pages themselves belong to the reader.
  const { data: chapters, isLoading: loadingChapters } = useBookChapters(
    id,
    editionId,
  );
  const { data: progress } = useReadingProgress(id, editionId, isAuthed);
  // The numbered tree — parts, chapters, sections. The flat list above is
  // the fallback while it loads (or fails), so the page never goes blank.
  const { data: contents } = useBookContents(id, editionId);

  const orderedChapters = useMemo(() => {
    const list = chapters ?? [];
    return ascending ? list : [...list].reverse();
  }, [chapters, ascending]);

  /**
   * The contents grouped for display: the unparted chapters first (under no
   * heading), then each part with its chapters. Reversing reverses the
   * groups AND the chapters within them, so "last chapter first" holds.
   * Null until the tree has loaded — the flat list renders then.
   */
  const groups = useMemo(() => {
    if (!contents) return null;
    const list: {
      part: { id: string; title: string; number: number } | null;
      chapters: BookChapterSummary[];
    }[] = [];
    if (contents.chapters.length > 0)
      list.push({ part: null, chapters: contents.chapters });
    for (const part of contents.parts)
      if (part.chapters.length > 0) list.push({ part, chapters: part.chapters });
    if (ascending) return list;
    return list
      .slice()
      .reverse()
      .map((g) => ({ ...g, chapters: g.chapters.slice().reverse() }));
  }, [contents, ascending]);

  /** How many sections the edition has, over every chapter — shown only when there are any. */
  const sectionCount = useMemo(
    () => (chapters ?? []).reduce((n, c) => n + (c.sections ?? []).length, 0),
    [chapters],
  );

  if (isLoading) return <DetailSkeleton />;

  if (!book || !edition) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={BookOpen}
          title={t.book.notFoundTitle}
          description={t.book.notFoundBody}
          action={
            <Button render={<Link href="/media/books" />} nativeButton={false}>
              {t.book.backToLibrary}
            </Button>
          }
        />
      </div>
    );
  }

  const cover = book.coverUrl ?? FALLBACK_COVER;
  // Where "Read" goes: back to the bookmark when there is one, and always
  // into the language currently selected.
  const readHref = `/read/${book.id}?edition=${edition.id}${
    progress?.chapterId ? `&chapter=${progress.chapterId}` : ""
  }`;
  const hasProgress = Boolean(progress && progress.progress > 0);

  return (
    <div className="pb-16">
      {/* ── Title band ─────────────────────────────────────────────────────
          The cover doubles as its own backdrop: blurred and darkened, it
          gives the band the book's colours without pretending a portrait
          cover is a landscape hero image. */}
      <header className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src={cover}
            alt=""
            fill
            priority
            unoptimized
            className="scale-110 object-cover blur-2xl brightness-[0.35] saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
        </div>

        <div className="mx-auto max-w-[1600px] px-4 pt-6 pb-10 sm:px-6 lg:px-8">
          <Link
            href="/media/books"
            className="focus-ring mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t.book.backToLibrary}
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            <div className="relative aspect-[5/7] w-40 shrink-0 self-center overflow-hidden rounded-xl shadow-e3 ring-1 ring-white/12 ring-inset sm:w-48 sm:self-start lg:w-56">
              <Image
                src={cover}
                alt={book.title}
                fill
                priority
                unoptimized
                sizes="224px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-display">{book.title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {book.author}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chip tone="info">
                  {isWritten ? t.book.formatEditor : t.book.formatPdf}
                </Chip>
                {book.categories.map((category) => (
                  <Chip key={category.id}>{category.name}</Chip>
                ))}
              </div>

              {book.description && (
                <div className="mt-6 max-w-3xl">
                  <Kicker className="mb-2">{t.book.summary}</Kicker>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {book.description}
                  </p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  render={<Link href={readHref} />}
                  nativeButton={false}
                >
                  <BookOpen className="size-4" />
                  {hasProgress ? t.book.continueReading : t.book.startReading}
                </Button>
                {book.editions.length > 1 && (
                  <span className="text-sm text-muted-foreground">
                    {t.book.readingIn(languageLabel(edition.language))}
                  </span>
                )}
              </div>

              {hasProgress && (
                <div className="mt-5 max-w-sm">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress!.progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 overflow-hidden rounded-full bg-white/10"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, progress!.progress)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground nums">
                    {Math.round(progress!.progress)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Contents + the facts ──────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <main className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-title">{t.book.chapterList}</h2>
            {(chapters?.length ?? 0) > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.book.sortOrder}
                title={t.book.sortOrder}
                onClick={() => setAscending((a) => !a)}
              >
                <ArrowUpDown className="size-4" />
              </Button>
            )}
          </div>

          {loadingChapters ? (
            <ul className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[5.5rem] w-full rounded-xl" />
              ))}
            </ul>
          ) : orderedChapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.book.noChapters}</p>
          ) : groups ? (
            <div className="space-y-6">
              {groups.map((group) => {
                const label = group.part
                  ? `${t.book.part(group.part.number)} · ${group.part.title}`
                  : null;
                return (
                  <section key={group.part?.id ?? "unparted"}>
                    {label && (
                      <Kicker
                        className="mb-2"
                        // Tracking is the point of a kicker in Latin — and
                        // what Myanmar script must never get.
                        style={{ letterSpacing: hasMyanmar(label) ? 0 : undefined }}
                      >
                        {label}
                      </Kicker>
                    )}
                    <ul className="space-y-2">
                      {group.chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <ChapterRow
                            chapter={chapter}
                            href={`/read/${book.id}?edition=${edition.id}&chapter=${chapter.id}`}
                            current={progress?.chapterId === chapter.id}
                          />
                          {chapter.status === "READY" &&
                            (chapter.sections ?? []).length > 0 && (
                              <SectionList
                                sections={chapter.sections}
                                isWritten={isWritten}
                                hrefFor={(s) =>
                                  `/read/${book.id}?edition=${edition.id}&chapter=${chapter.id}&${
                                    isWritten ? `section=${s.id}` : `page=${s.startPage ?? 1}`
                                  }`
                                }
                              />
                            )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-2">
              {orderedChapters.map((chapter) => (
                <li key={chapter.id}>
                  <ChapterRow
                    chapter={chapter}
                    href={`/read/${book.id}?edition=${edition.id}&chapter=${chapter.id}`}
                    current={progress?.chapterId === chapter.id}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* The thread carries the page gutters itself (movie/series mount it
              at page level); this column already sits inside them, so cancel
              them here to keep the thread flush with the chapter list. */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <CommentsSection bookId={book.id} />
          </div>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <LanguagePanel
            editions={book.editions}
            selectedId={edition.id}
            onSelect={selectLanguage}
          />

          <section className="glass-card p-5">
            <Kicker className="mb-1">{t.book.details}</Kicker>
            <div className="divide-y divide-white/6">
              <DetailRow icon={User} label={t.book.author} value={book.author} />
              <DetailRow
                icon={FileText}
                label={t.book.format}
                value={isWritten ? t.book.formatEditor : t.book.formatPdf}
              />
              <DetailRow
                icon={Layers}
                label={t.book.chapters}
                value={String(edition.chapterCount)}
              />
              {sectionCount > 0 && (
                <DetailRow
                  icon={Layers}
                  label={t.book.sections}
                  value={String(sectionCount)}
                />
              )}
              {edition.publishedAt && (
                <DetailRow
                  icon={CalendarDays}
                  label={t.book.published}
                  value={new Date(edition.publishedAt).toLocaleDateString()}
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/**
 * ONE ROW OF THE CONTENTS — the same row for both kinds of book.
 *
 * A written chapter and a scanned one differ only in what the row can say
 * about them: the scanned one knows how many pages it converted. Every
 * chapter can carry its own image, so the list reads like a shelf of
 * instalments rather than a table of contents.
 *
 * A chapter that is not READY is deliberately NOT a link: its file is still
 * converting (or never arrived), and opening it would show a reader with
 * nothing in it.
 */
function ChapterRow({
  chapter,
  href,
  current,
}: {
  chapter: BookChapterSummary;
  href: string;
  current: boolean;
}) {
  const { t } = useLanguage();
  const openable = chapter.status === "READY";
  const hasPages = chapter.pageCount > 0;

  const body = (
    <>
      <span className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-white/6 ring-1 ring-white/10 ring-inset">
        {chapter.imageUrl ? (
          <Image
            src={chapter.imageUrl}
            alt=""
            fill
            unoptimized
            loading="lazy"
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <BookOpen className="size-5" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted-foreground nums">
          {/* The server's reading-order number — equal to `order` for every
              existing book, continuous across parts once a book has them. */}
          {t.book.chapterNumber(Number(chapter.number) || chapter.order)}
        </span>
        <span className="mt-0.5 block truncate font-medium">
          {chapter.title}
        </span>
        {(hasPages || !openable || current) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {hasPages && (
              <span className="text-muted-foreground nums">
                {t.book.chapterPages(chapter.pageCount)}
              </span>
            )}
            {!openable && (
              <span className="text-muted-foreground">
                {t.media.comingSoon}
              </span>
            )}
            {current && openable && (
              <span className="text-primary">{t.book.continueReading}</span>
            )}
          </span>
        )}
      </span>
    </>
  );

  const base = "flex items-center gap-4 rounded-xl p-3 transition-colors";

  if (!openable) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-default bg-white/[0.02] opacity-60")}
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "focus-ring",
        base,
        current
          ? "bg-primary/12 ring-1 ring-primary/25 ring-inset"
          : "bg-white/[0.03] hover:bg-white/[0.06]",
      )}
    >
      {body}
    </Link>
  );
}

/**
 * A chapter's sections, listed compactly beneath its row. Each is a deep
 * link into the reader: a written section lands on its heading, a scanned
 * one on its first page. Sits OUTSIDE the row's link — a list inside an
 * anchor is invalid markup.
 */
function SectionList({
  sections,
  isWritten,
  hrefFor,
}: {
  sections: BookSectionSummary[];
  isWritten: boolean;
  hrefFor: (section: BookSectionSummary) => string;
}) {
  const { t } = useLanguage();
  return (
    <ul className="mt-1 ml-[7.75rem] space-y-0.5 pr-3">
      {sections.map((section) => (
        <li key={section.id}>
          <Link
            href={hrefFor(section)}
            className="focus-ring flex items-baseline gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <span className="shrink-0 text-xs nums">{section.number}</span>
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
            {!isWritten && section.startPage !== null && (
              <span className="shrink-0 text-xs nums">
                {t.book.pageRange(
                  section.startPage,
                  section.endPage ?? section.startPage,
                )}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 sm:flex-row">
        <Skeleton className="aspect-[5/7] w-40 shrink-0 rounded-xl sm:w-48 lg:w-56" />
        <div className="flex-1 space-y-4 pt-2">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full max-w-3xl" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
