"use client";

import { use, useId, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpDown, BookOpen, Languages, ListOrdered, LogIn } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCard } from "@/components/cards";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ShareDialog } from "@/components/modals/ShareDialog";
import { Artwork, CheckIcon, ChevronRightIcon, PlayIcon, Row, ShareIcon } from "@/components/system";
import { hasMyanmar } from "@/components/books/reader-settings";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { titlesText } from "@/lib/i18n/sections/titles";
import {
  useBook,
  useBookChapters,
  useBookContents,
  useBooks,
  useReadingProgress,
} from "@/hooks/use-books";
import {
  languageLabel,
  languageSubLabel,
  loadPreferredLanguage,
  pickEdition,
  savePreferredLanguage,
} from "@/lib/books/languages";
import { loginHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/utils";
import type { BookChapterSummary, BookEdition, BookSectionSummary } from "@/types/book";
import { DetailHero, HeroProgress, HeroSynopsisToggle } from "../../movie/_detail/DetailHero";
import {
  DetailColumns,
  DetailsPanel,
  TitleNotFound,
  TitleSkeleton,
  type DetailFact,
} from "../../movie/_detail/DetailPanels";

const BOOKS_HREF = "/media/books";
/** The Books hub narrowed to one category (BooksView reads `?category=` on load). */
const booksInCategoryHref = (categoryId: string) =>
  `${BOOKS_HREF}?category=${encodeURIComponent(categoryId)}`;

/**
 * THE BOOK DETAIL PAGE (BookDetail board).
 *
 * The cover over a backdrop in the book's own colours, then the contents on
 * the left and the facts about the edition on the right — the shape a
 * serialised-fiction site uses, because it answers the two questions a
 * reader actually arrives with: "what language can I read this in" and
 * "where do I start".
 *
 * Language is the organising axis, not a setting: chapters, pages and the
 * bookmark all belong to one edition, so choosing a language re-points the
 * whole page rather than filtering it.
 *
 * Every /books read needs an account, so a signed-out visitor gets the
 * sign-in screen instead of a page that could only fail.
 */
export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const titleId = useId();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAuthed = Boolean(user);

  const { data: book, isLoading } = useBook(id);

  const [chosenEditionId, setChosenEditionId] = useState<string | null>(null);
  const [ascending, setAscending] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  // The language being read: the one picked on this page, else the reader's
  // standing preference if this title has it, otherwise whatever it does have.
  const edition = useMemo(() => {
    if (!book) return null;
    return (
      book.editions.find((e) => e.id === chosenEditionId) ??
      pickEdition(book.editions, loadPreferredLanguage())
    );
  }, [book, chosenEditionId]);
  const editionId = edition?.id ?? null;

  const selectLanguage = (next: BookEdition) => {
    setChosenEditionId(next.id);
    savePreferredLanguage(next.language);
  };

  const isWritten = book?.type === "EDITOR";
  // The chapter is the unit of content for BOTH types now: a written chapter
  // holds its text, a scanned one holds its own release of pages. So there is
  // one list, and the pages themselves belong to the reader.
  const { data: chapters, isLoading: loadingChapters } = useBookChapters(id, editionId);
  const { data: progress } = useReadingProgress(id, editionId, isAuthed);
  // The numbered tree — parts, chapters, sections. The flat list above is
  // the fallback while it loads (or fails), so the page never goes blank.
  const { data: contents } = useBookContents(id, editionId);

  // "More in {category}": the library filtered to this book's first category.
  const categoryId = book?.categories[0]?.id;
  // The shared loader keeps the previous result on screen while a new one
  // loads; here that would be the LAST book's category under THIS book's
  // heading, so a placeholder result is never shown (isPlaceholderData).
  const { data: sameCategory, isPlaceholderData: sameCategoryIsStale } = useBooks(
    { categoryId, limit: 13 },
    { enabled: Boolean(categoryId) && isAuthenticated },
  );

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
    if (contents.chapters.length > 0) list.push({ part: null, chapters: contents.chapters });
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

  if (isAuthLoading) return <TitleSkeleton kind="book" label={s.loadingBook} />;

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col items-center px-gutter pt-[clamp(80px,10vw,140px)] pb-10 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-tonal-faint text-fg-muted">
          <BookOpen className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-[18px] text-section-title text-fg">{s.signInToReadTitle}</h1>
        <p className="mt-1.5 max-w-[380px] text-[15px] leading-[23px] text-fg-muted">{s.signInToReadBody}</p>
        <Link href={loginHref(`/books/${id}`)} className={cn(buttonVariants({ variant: "play", size: "cta" }), "mt-5")}>
          <LogIn aria-hidden strokeWidth={1.75} />
          {t.nav.signIn}
        </Link>
        <Link href="/register" className="mq-link mt-3.5 rounded-[6px] text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
          {s.createAccount}
        </Link>
      </section>
    );
  }

  if (isLoading) return <TitleSkeleton kind="book" label={s.loadingBook} />;

  if (!book || !edition) {
    return (
      <TitleNotFound
        icon={<BookOpen className="size-7" strokeWidth={1.75} />}
        title={t.book.notFoundTitle}
        body={t.book.notFoundBody}
        backHref={BOOKS_HREF}
        backLabel={t.book.backToLibrary}
      />
    );
  }

  // Where "Read" goes: back to the bookmark when there is one, and always
  // into the language currently selected.
  const readHref = `/read/${book.id}?edition=${edition.id}${
    progress?.chapterId ? `&chapter=${progress.chapterId}` : ""
  }`;
  const hasProgress = Boolean(progress && progress.progress > 0);
  const readLabel = hasProgress ? t.book.continueReading : t.book.startReading;
  const formatLabel = isWritten ? t.book.formatEditor : t.book.formatPdf;
  const chapterNumberOf = (chapter: BookChapterSummary) => Number(chapter.number) || chapter.order;
  const bookmarkChapter = progress?.chapterId ? (chapters ?? []).find((c) => c.id === progress.chapterId) : undefined;
  const readyCount = (chapters ?? []).filter((c) => c.status === "READY").length;
  const totalCount = chapters?.length ?? 0;
  const publishedDate = edition.publishedAt ? new Date(edition.publishedAt).toLocaleDateString() : null;

  const facts: DetailFact[] = [
    { label: t.book.author, value: book.author },
    { label: t.book.format, value: formatLabel },
    ...(book.categories.length > 0
      ? [{ label: t.book.categories, value: book.categories.map((c) => c.name).join(", ") }]
      : []),
    { label: t.book.chapters, value: String(edition.chapterCount) },
    ...(sectionCount > 0 ? [{ label: t.book.sections, value: String(sectionCount) }] : []),
    ...(publishedDate ? [{ label: t.book.published, value: publishedDate }] : []),
  ];

  const moreBooks = sameCategoryIsStale
    ? []
    : (sameCategory?.items ?? []).filter((b) => b.id !== book.id).slice(0, 12);
  const firstCategory = book.categories[0];

  const chapterHref = (chapter: BookChapterSummary) =>
    `/read/${book.id}?edition=${edition.id}&chapter=${chapter.id}`;

  const renderChapter = (chapter: BookChapterSummary, withSections: boolean) => (
    <li key={chapter.id}>
      <ChapterRow
        chapter={chapter}
        number={chapterNumberOf(chapter)}
        href={chapterHref(chapter)}
        current={progress?.chapterId === chapter.id}
      />
      {withSections && chapter.status === "READY" && (chapter.sections ?? []).length > 0 && (
        <SectionList
          chapterNumber={chapterNumberOf(chapter)}
          sections={ascending ? chapter.sections : chapter.sections.slice().reverse()}
          isWritten={isWritten}
          hrefFor={(section) =>
            `${chapterHref(chapter)}&${isWritten ? `section=${section.id}` : `page=${section.startPage ?? 1}`}`
          }
        />
      )}
    </li>
  );

  return (
    <div className="flex flex-col">
      <DetailHero
        seed={book.title}
        backHref={BOOKS_HREF}
        backLabel={t.book.backToLibrary}
        titleId={titleId}
        className="min-h-0 pt-[calc(var(--shell-bar-h)+56px)]"
        copyClassName="max-w-none"
        backdrop={
          // The cover doubles as its own backdrop: blurred and darkened, it
          // gives the band the book's colours without pretending a portrait
          // cover is a landscape hero image.
          <Artwork
            src={book.coverUrl}
            seed={book.title}
            variant="hero"
            sizes="100vw"
            priority
            zoomOnHover={false}
            className={book.coverUrl ? "scale-110 blur-2xl brightness-[0.5] saturate-150" : undefined}
          />
        }
      >
        <div className="mt-6 grid items-end gap-x-[clamp(24px,3.4vw,56px)] gap-y-7 desk:grid-cols-[auto_minmax(0,1fr)]">
          <span
            role="img"
            aria-label={s.coverOf(book.title, book.author)}
            className="relative block aspect-[5/7] w-[clamp(132px,38vw,168px)] overflow-hidden rounded-[4px_14px_14px_4px] bg-raised desk:w-[clamp(168px,16vw,232px)]"
          >
            <Artwork src={book.coverUrl} seed={book.title} variant="book" sizes="232px" priority zoomOnHover={false}>
              <span
                aria-hidden
                className="absolute top-[9%] right-[8%] left-[12%] line-clamp-3 text-[clamp(18px,1.8vw,26px)] leading-[1.08] font-black tracking-[-0.01em] text-white"
              >
                {book.title}
              </span>
              <span
                aria-hidden
                className="absolute top-[40%] right-[8%] left-[12%] line-clamp-1 text-[clamp(10px,0.9vw,13px)] leading-[1.2] font-bold tracking-[0.08em] text-white/80 uppercase"
              >
                {book.author}
              </span>
            </Artwork>
          </span>

          <div className="min-w-0 max-w-[720px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-[22px] items-center rounded-[4px] bg-info/16 px-[7px] text-[11px] font-extrabold tracking-[0.06em] text-info uppercase [&:lang(my)]:tracking-normal">
                {formatLabel}
              </span>
              {book.categories.map((category) => (
                <Link
                  key={category.id}
                  href={booksInCategoryHref(category.id)}
                  className="h-[22px] rounded-[4px] bg-hairline-strong px-2 text-xs leading-[22px] font-bold text-fg outline-none transition-colors duration-150 hover:bg-tonal-hover motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                >
                  {category.name}
                </Link>
              ))}
              <span className="text-sm leading-5 font-semibold text-fg-body">{s.book}</span>
            </div>

            <h1 id={titleId} className="mt-3.5 text-display text-balance text-fg">
              {book.title}
            </h1>
            <p className="mt-2 text-lg leading-6 text-fg-body">{t.book.byAuthor(book.author)}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-[22px] text-fg-muted tabular-nums">
              <span>{t.book.chapterCount(edition.chapterCount)}</span>
              <span>{s.sectionCount(sectionCount)}</span>
              {publishedDate && <span>{s.publishedOn(publishedDate)}</span>}
            </p>

            {book.description && <HeroSynopsisToggle>{book.description}</HeroSynopsisToggle>}

            <div className="mt-[22px] flex flex-wrap items-center gap-3">
              <Link
                href={readHref}
                aria-label={s.readA11y(readLabel, book.title)}
                className={cn(buttonVariants({ variant: "play", size: "hero" }), "px-[26px]")}
              >
                {hasProgress ? <PlayIcon /> : <BookOpen aria-hidden strokeWidth={1.75} />}
                {readLabel}
              </Link>
              <a href="#chapters" className={cn(buttonVariants({ variant: "tonal", size: "hero" }), "px-[22px] text-base font-bold")}>
                <ListOrdered aria-hidden strokeWidth={1.75} />
                {t.book.chapters}
              </a>
              <Button
                variant="tonal"
                size="icon-hero"
                aria-haspopup="dialog"
                aria-label={s.share(book.title)}
                onClick={() => setShareOpen(true)}
              >
                <ShareIcon size={22} />
              </Button>
              <span className="text-sm leading-5 text-fg-muted">{t.book.readingIn(languageLabel(edition.language))}</span>
            </div>

            {hasProgress && progress && (
              <HeroProgress
                percent={progress.progress}
                label={s.readLabel}
                caption={
                  bookmarkChapter
                    ? s.readProgress(
                        Math.round(progress.progress),
                        s.chapterNamed(chapterNumberOf(bookmarkChapter), bookmarkChapter.title),
                      )
                    : `${Math.round(progress.progress)}%`
                }
              />
            )}
          </div>
        </div>
      </DetailHero>

      <div className="mt-10 flex flex-col gap-[clamp(36px,3.4vw,52px)]">
        <DetailColumns
          asideLabel={s.aboutBook}
          aside={
            <>
              <EditionsPanel editions={book.editions} selectedId={edition.id} onSelect={selectLanguage} />
              <DetailsPanel facts={facts} />
            </>
          }
        >
          <section
            id="chapters"
            aria-labelledby={`${titleId}-chapters`}
            className="min-w-0 scroll-mt-[calc(var(--shell-bar-h)+24px)]"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2
                  id={`${titleId}-chapters`}
                  className="text-[clamp(24px,2.2vw,30px)] leading-[1.2] font-black tracking-[-0.02em] text-fg"
                >
                  {t.book.chapterList}
                </h2>
                {totalCount > 0 && (
                  <p className="mt-1 text-sm leading-5 text-fg-faint tabular-nums">
                    {readyCount === totalCount
                      ? t.book.chapterCount(totalCount)
                      : s.chaptersReady(readyCount, totalCount - readyCount)}
                  </p>
                )}
              </div>
              {totalCount > 1 && (
                <Button
                  variant="tonal"
                  size="toolbar"
                  aria-pressed={!ascending}
                  aria-label={t.book.sortOrder}
                  title={t.book.sortOrder}
                  onClick={() => setAscending((a) => !a)}
                  className="px-3.5"
                >
                  <ArrowUpDown aria-hidden strokeWidth={1.75} />
                  <span className="max-desk:hidden">{ascending ? s.firstChapterFirst : s.lastChapterFirst}</span>
                </Button>
              )}
            </div>

            <div className="mt-5">
              {loadingChapters ? (
                <ul aria-hidden className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {Array.from({ length: 5 }, (_, i) => (
                    <li key={i}>
                      <Skeleton className="h-[88px] w-full rounded-[16px]" />
                    </li>
                  ))}
                </ul>
              ) : orderedChapters.length === 0 ? (
                <p className="rounded-[16px] bg-surface px-6 py-8 text-center text-[15px] text-fg-muted">{t.book.noChapters}</p>
              ) : groups ? (
                <div className="flex flex-col gap-7">
                  {groups.map((group) => {
                    const label = group.part ? `${t.book.part(group.part.number)} · ${group.part.title}` : null;
                    const list = (
                      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {group.chapters.map((chapter) => renderChapter(chapter, true))}
                      </ol>
                    );
                    if (!label) return <div key="unparted">{list}</div>;
                    return (
                      <section key={group.part!.id} aria-label={label}>
                        <h3
                          className="mb-2.5 ml-1 text-xs leading-4 font-extrabold tracking-[0.1em] text-fg-faint uppercase"
                          // Tracking is the point of an overline in Latin —
                          // and what Myanmar script must never get.
                          style={{ letterSpacing: hasMyanmar(label) ? 0 : undefined }}
                        >
                          {label}
                        </h3>
                        {list}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {orderedChapters.map((chapter) => renderChapter(chapter, false))}
                </ol>
              )}
            </div>
          </section>
        </DetailColumns>

        {moreBooks.length > 0 && (
          <Row
            title={firstCategory ? s.moreInCategory(firstCategory.name) : s.moreBooks}
            seeAllHref={firstCategory ? booksInCategoryHref(firstCategory.id) : BOOKS_HREF}
          >
            {moreBooks.map((item) => {
              const chaptersInFirst = item.editions[0]?.chapterCount ?? 0;
              return (
                <BookCard
                  key={item.id}
                  layout="rail"
                  title={item.title}
                  author={item.author}
                  href={`/books/${item.id}`}
                  coverUrl={item.coverUrl}
                  meta={chaptersInFirst > 0 ? `${item.author} · ${t.book.chapterCount(chaptersInFirst)}` : item.author}
                />
              );
            })}
          </Row>
        )}

        <CommentsSection
          bookId={book.id}
          className="max-w-[calc(820px+2*clamp(16px,4vw,56px))] px-gutter"
        />
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={book.title}
        url={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}

/**
 * "AVAILABLE LANGUAGES" — the languages a book is actually published in, and
 * the one being read. A panel rather than a dropdown: on a translated title
 * the language is a headline fact about what you are getting. A
 * single-language book states the fact instead of offering a choice that
 * isn't one.
 */
function EditionsPanel({
  editions,
  selectedId,
  onSelect,
}: {
  editions: BookEdition[];
  selectedId: string;
  onSelect: (edition: BookEdition) => void;
}) {
  const { t } = useLanguage();
  const headingId = useId();
  if (editions.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="rounded-[16px] bg-surface px-5 pt-5 pb-4">
      <h2
        id={headingId}
        className="mb-3 ml-1 flex items-center gap-2 text-label font-extrabold tracking-[0.1em] text-fg-faint uppercase [&:lang(my)]:tracking-normal"
      >
        <Languages aria-hidden className="size-4" strokeWidth={1.75} />
        {t.book.availableLanguages}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {editions.map((edition) => {
          const selected = edition.id === selectedId;
          const sub = languageSubLabel(edition.language);
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-5 font-extrabold text-fg">
                  {languageLabel(edition.language)}
                </span>
                {sub && <span className="block truncate text-[13px] leading-5 text-fg-muted">{sub}</span>}
              </span>
              <span className="shrink-0 text-[13px] leading-[18px] text-fg-faint tabular-nums">
                {t.book.chapterCount(edition.chapterCount)}
              </span>
              {selected && editions.length > 1 && <CheckIcon size={18} strokeWidth={2.2} className="shrink-0 text-link" />}
            </>
          );
          return (
            <li key={edition.id}>
              {editions.length === 1 ? (
                <div className="flex w-full items-center gap-3 rounded-[12px] bg-raised px-3 py-2.5">{inner}</div>
              ) : (
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(edition)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-[12px] border-0 px-3 py-2.5 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                    selected ? "bg-crimson/14" : "bg-raised hover:bg-raised-hover",
                  )}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
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
  number,
  href,
  current,
}: {
  chapter: BookChapterSummary;
  number: number;
  href: string;
  current: boolean;
}) {
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const openable = chapter.status === "READY";
  const hasPages = chapter.pageCount > 0;
  const pages = hasPages ? t.book.chapterPages(chapter.pageCount) : null;

  const body = (
    <>
      <span className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-raised text-fg-faint">
        {chapter.imageUrl ? (
          <Image src={chapter.imageUrl} alt="" fill loading="lazy" sizes="96px" className="object-cover" />
        ) : (
          <BookOpen aria-hidden className="size-6" strokeWidth={1.75} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        {/* The server's reading-order number — equal to `order` for every
            existing book, continuous across parts once a book has them. */}
        <span className="block text-[13px] leading-[18px] font-bold text-fg-faint tabular-nums">
          {t.book.chapterNumber(number)}
        </span>
        <span className="mt-px block truncate text-base leading-[22px] font-extrabold text-fg">{chapter.title}</span>
        {(hasPages || !openable || current) && (
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] leading-[18px] tabular-nums">
            {pages && <span className="text-fg-faint">{pages}</span>}
            {!openable && <span className="text-fg-faint">{t.media.comingSoon}</span>}
            {current && openable && <span className="font-bold text-link">{t.book.continueReading}</span>}
          </span>
        )}
      </span>
      {openable && <ChevronRightIcon size={20} className="shrink-0 text-fg-faint" />}
    </>
  );

  const base = "flex items-center gap-4 rounded-[16px] p-3";

  if (!openable) {
    return (
      <div aria-disabled="true" className={cn(base, "opacity-55")}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={s.chapterA11y({ number, title: chapter.title, pages, current })}
      className={cn(
        base,
        "transition-colors duration-150 outline-none hover:bg-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
        current ? "bg-crimson/12" : "bg-transparent",
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
  chapterNumber,
  sections,
  isWritten,
  hrefFor,
}: {
  chapterNumber: number;
  sections: BookSectionSummary[];
  isWritten: boolean;
  hrefFor: (section: BookSectionSummary) => string;
}) {
  const { t } = useLanguage();
  const s = useSection(titlesText);
  return (
    <ul
      aria-label={s.sectionsOf(chapterNumber)}
      className="m-0 mt-1 mb-2 flex list-none flex-col gap-0.5 py-0 pr-0 pl-[clamp(16px,9vw,124px)]"
    >
      {sections.map((section) => {
        const page = !isWritten ? section.startPage : null;
        return (
          <li key={section.id}>
            <Link
              href={hrefFor(section)}
              aria-label={s.sectionA11y(section.number, section.title, page)}
              className="flex items-baseline gap-2.5 rounded-[10px] px-3 py-[7px] text-sm leading-5 text-fg-body transition-colors outline-none hover:bg-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              <span className="shrink-0 text-xs font-bold text-fg-faint tabular-nums">{section.number}</span>
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              {page !== null && (
                <span className="shrink-0 text-xs text-fg-faint tabular-nums">
                  {t.book.pageRange(page, section.endPage ?? page)}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
