"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BookCard, PersonDisc } from "@/components/cards";
import { Artwork } from "@/components/system/Artwork";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import {
  CardGrid,
  CloseIcon,
  FallbackArt,
  FilterChip,
  GridLoadingMore,
  HeroActions,
  HeroMeta,
  HeroPager,
  HeroSynopsis,
  HeroTags,
  HeroTitle,
  InfoIcon,
  PeopleIcon,
  Row,
  RowStack,
  SearchIcon,
  SegmentedControl,
  Tag,
} from "@/components/system";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useBookChapters, useBooks, useBooksInfinite, useReadingProgress, type BooksInfiniteData } from "@/hooks/use-books";
import { useSearchTerm } from "@/hooks/use-search-term";
import { loginHref } from "@/lib/auth/return-to";
import { languageLabel } from "@/lib/books/languages";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import type { Book, BookQuery, BookType } from "@/types/book";
import { AllSectionHeader, HubSkeleton, InfiniteSentinel } from "./CatalogParts";
import { HeroAnnouncer } from "./HeroAnnouncer";
import { isRecent } from "./media-data";

// The Categories overlay is closed until `?categories=` asks for it, so its
// code is fetched the first time it opens instead of with the page.
const CategoriesOverlayFromUrl = dynamic(
  () => import("./CategoriesOverlay").then((mod) => mod.CategoriesOverlayFromUrl),
  { ssr: false },
);

/** One page of the newest books feeds the hero and the rows. */
const POOL_LIMIT = 60;
/** "All books" pages through the whole library, this many at a time. */
const SHELF_PAGE_SIZE = 30;
/** The pool's own cache key (useBooks keys on ["books", query]). */
const POOL_QUERY: BookQuery = { limit: POOL_LIMIT };

/** Where an author's other books are found: the Search page's Books tab. */
function authorHref(author: string): string {
  return `/search?tab=books&q=${encodeURIComponent(author)}`;
}

/**
 * THE BOOKS HUB (MediaBooks.dc.html) — /media/books.
 *
 * Members only (GET /books is 401 for a guest), so a guest gets the sign-in
 * screen and the library is never asked for. For members: the featured-books
 * hero (the cover as a real 5:7 book over a scene in its colours, Start /
 * Continue reading with the reading line), the shelf rows (New on the shelf,
 * the two biggest categories, Text or scanned pages, Burmese or English,
 * Authors), then "All books" — the same server-side search over titles and
 * authors as before (debounced, Escape clears), a Format switch, category
 * chips over what is on the shelf, and the book grid.
 */
export function BooksView() {
  // `?category=<id>` (a book page's tags, its "More in …" See all, or a pick
  // in the Categories overlay) opens "All books" with that category picked.
  const params = useSearchParams();
  const urlCategory = params.get("category")?.trim() || null;
  // Mounted from the first time `?categories=` is set, then kept (so it can
  // animate closed and keep its state).
  const categoriesParam = params.get("categories") !== null;
  const [categoriesOpened, setCategoriesOpened] = useState(categoriesParam);
  if (categoriesParam && !categoriesOpened) setCategoriesOpened(true);

  // The category "All books" shows — one value for the on-page chips AND the
  // Categories overlay, so the overlay lights up a chip's pick and an overlay
  // pick replaces a chip's pick. `opening` counts the picks that restart the
  // hub on a category (an overlay pick, or the address changing under it,
  // e.g. Back); a chip tap only changes the category in place.
  const [shelf, setShelf] = useState<{ categoryId: string | null; opening: number }>(() => ({
    categoryId: urlCategory,
    opening: 0,
  }));
  const openOn = (categoryId: string | null) =>
    setShelf((prev) => ({ categoryId, opening: prev.opening + 1 }));
  const [seenUrlCategory, setSeenUrlCategory] = useState(urlCategory);
  if (urlCategory !== seenUrlCategory) {
    // The address's category changed (an overlay link, Back/Forward, a link
    // from elsewhere): start "All books" on it, unless it is already showing.
    setSeenUrlCategory(urlCategory);
    if (urlCategory !== shelf.categoryId) openOn(urlCategory);
  }

  return (
    <>
      <BooksGate
        categoryId={shelf.categoryId}
        opening={shelf.opening}
        onCategoryChange={(categoryId) => setShelf((prev) => ({ ...prev, categoryId }))}
      />
      {/* The Media chip strip's Categories chip opens this on the Books list
          (`?categories=books`); guests get its sign-in prompt instead. */}
      {(categoriesOpened || categoriesParam) && (
        <CategoriesOverlayFromUrl
          pageKind="books"
          current={shelf.categoryId ? `category:${shelf.categoryId}` : "all"}
          onPick={(kind, pick) => {
            // Movies / Series picks leave this page. A Books pick always takes
            // effect, even when the address it links to is the one already
            // showing (e.g. "All books" after a chip narrowed the shelf).
            if (kind !== "books") return;
            if (pick === "all") openOn(null);
            else if (pick.startsWith("category:")) openOn(pick.slice("category:".length));
          }}
        />
      )}
    </>
  );
}

function BooksGate({
  categoryId,
  opening,
  onCategoryChange,
}: {
  categoryId: string | null;
  opening: number;
  onCategoryChange: (id: string | null) => void;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // The newest page of the library — the hero and every row come from it.
  const pool = useBooks(POOL_QUERY, { enabled: isAuthenticated });

  if (!isAuthenticated && !isAuthLoading) return <GuestShelf />;
  if (isAuthLoading || pool.isLoading) return <HubSkeleton label={m.loadingBooks} rows={["book", "book"]} />;
  if (pool.isError && !pool.data) {
    return (
      <div className="px-gutter pt-[clamp(96px,10vw,160px)] pb-[120px]">
        <h1 className="sr-only">{m.books}</h1>
        <ErrorState title={m.loadBooksFailed} description={t.browse.loadFailed} onRetry={() => void pool.refetch()} />
      </div>
    );
  }
  // Keyed by the openings, so a pick from the Categories overlay (or a new
  // `?category=` in the address) starts the hub on it again.
  return (
    <BooksHub
      key={opening}
      pool={pool.data?.items ?? []}
      categoryId={categoryId}
      setCategoryId={onCategoryChange}
    />
  );
}

function BooksHub({
  pool,
  categoryId,
  setCategoryId,
}: {
  pool: Book[];
  /** The category "All books" shows (null = every book); owned by BooksView. */
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const allRef = useRef<HTMLElement>(null);
  // Arriving with a category (`?category=<id>` from a book page's tags, its
  // "More in …" See all, or an overlay pick) opens the hub with it picked.
  const [initialCategory] = useState<string | null>(categoryId);
  const [formatRow, setFormatRow] = useState<BookType>("EDITOR");
  const [languageRow, setLanguageRow] = useState<"my" | "en">("my");

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; n: number }>();
    for (const book of pool) {
      for (const c of book.categories) {
        const entry = counts.get(c.id) ?? { id: c.id, name: c.name, n: 0 };
        entry.n += 1;
        counts.set(c.id, entry);
      }
    }
    return [...counts.values()].sort((a, b) => b.n - a.n);
  }, [pool]);

  const authors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of pool) counts.set(book.author, (counts.get(book.author) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pool]);

  const hasBothFormats = pool.some((b) => b.type === "EDITOR") && pool.some((b) => b.type === "PDF");
  const hasBothLanguages = pool.some((b) => b.languages.includes("my")) && pool.some((b) => b.languages.includes("en"));

  /** Jump to "All books", showing one category (or every book for null). */
  const showCategory = (id: string | null) => {
    setCategoryId(id);
    const el = allRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };

  // Arriving with a category: bring "All books" (already filtered) into view once.
  useEffect(() => {
    if (!initialCategory) return;
    const el = allRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, [initialCategory]);

  if (pool.length === 0) {
    return (
      <div className="px-gutter pt-10">
        <h1 className="text-title text-fg">{m.books}</h1>
        <EmptyState icon={BookOpen} title={t.media.emptyLibraryTitle} description={t.media.emptyLibraryBody} />
      </div>
    );
  }

  return (
    <div className="mq-rise">
      <BookHero books={pool.slice(0, 5)} />

      <RowStack className="mt-2">
        <Row
          title={t.media.newBooks}
          subtitle={m.newestFirst}
          action={<SeeAllButton label={m.seeAllOf(t.media.newBooks)} onClick={() => showCategory(null)} />}
        >
          {pool.slice(0, 14).map((book) => (
            <ShelfBookCard key={book.id} book={book} layout="rail" />
          ))}
        </Row>

        {categoryCounts.slice(0, 2).map((category) => (
          <Row
            key={category.id}
            title={category.name}
            subtitle={t.media.bookCount(category.n)}
            action={<SeeAllButton label={m.seeAllOf(category.name)} onClick={() => showCategory(category.id)} />}
          >
            {pool
              .filter((b) => b.categories.some((c) => c.id === category.id))
              .slice(0, 14)
              .map((book) => (
                <ShelfBookCard key={book.id} book={book} layout="rail" />
              ))}
          </Row>
        ))}

        {hasBothFormats && (
          <Row
            title={m.textOrScanned}
            subtitle={t.media.bookCount(pool.filter((b) => b.type === formatRow).length)}
            action={
              <SegmentedControl
                size="sm"
                label={m.format}
                value={formatRow}
                onChange={setFormatRow}
                options={[
                  { value: "EDITOR", label: t.book.formatEditor },
                  { value: "PDF", label: t.book.formatPdf },
                ]}
              />
            }
          >
            {pool
              .filter((b) => b.type === formatRow)
              .slice(0, 14)
              .map((book) => (
                <ShelfBookCard key={book.id} book={book} layout="rail" />
              ))}
          </Row>
        )}

        {hasBothLanguages && (
          <Row
            title={m.burmeseOrEnglish}
            subtitle={t.media.bookCount(pool.filter((b) => b.languages.includes(languageRow)).length)}
            action={
              <SegmentedControl
                size="sm"
                label={m.language}
                value={languageRow}
                onChange={setLanguageRow}
                options={[
                  { value: "my", label: "မြန်မာ", lang: "my" },
                  { value: "en", label: "English", lang: "en" },
                ]}
              />
            }
          >
            {pool
              .filter((b) => b.languages.includes(languageRow))
              .slice(0, 14)
              .map((book) => (
                <ShelfBookCard key={book.id} book={book} layout="rail" />
              ))}
          </Row>
        )}

        {authors.length > 0 && (
          <Row title={m.authors} subtitle={m.authorsSub} railClassName="gap-5">
            {authors.map(([name, n]) => (
              <PersonDisc key={name} name={name} role={t.media.bookCount(n)} href={authorHref(name)} className="w-[120px]" />
            ))}
          </Row>
        )}

        <AllBooks
          ref={allRef}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
        />
      </RowStack>
    </div>
  );
}

/** A row's "See all" that jumps down to "All books" (a button: it also sets the category). */
function SeeAllButton({ label, onClick }: { label: string; onClick: () => void }) {
  const seeAll = useSection(shellText).seeAll;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mq-link cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-[15px] leading-5 font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      {seeAll}
    </button>
  );
}

/**
 * A `Book` on the shared book card (components/cards/BookCard): cover with
 * spine, NEW for 14 days, the title, then "Author · N chapters" (the first
 * published language's count, the one the card opens into).
 */
function ShelfBookCard({
  book,
  layout = "grid",
  priority = false,
  showCategory = false,
}: {
  book: Book;
  layout?: "rail" | "grid";
  priority?: boolean;
  /** The "All books" grid shows the first category above the title (the board's overline). */
  showCategory?: boolean;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  return (
    <BookCard
      title={book.title}
      author={book.author}
      href={`/books/${book.id}`}
      coverUrl={book.coverUrl}
      overline={showCategory ? book.categories[0]?.name : undefined}
      meta={m.bookMeta(book.author, t.book.chapterCount(book.editions[0]?.chapterCount ?? 0))}
      isNew={isRecent(book.createdAt)}
      layout={layout}
      priority={priority}
      sizes={layout === "grid" ? "(max-width: 719px) 33vw, 180px" : undefined}
    />
  );
}

/* ═══════════════════════════════ THE HERO ═══════════════════════════════ */

function BookHero({ books }: { books: Book[] }) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  useTopBarOverHero();

  const count = books.length;
  const safeIndex = count > 0 ? index % count : 0;
  const book = books[safeIndex];
  const edition = book?.editions[0] ?? null;
  const progress = useReadingProgress(book?.id ?? "", edition?.id ?? null, isAuthenticated);
  const reachedChapterId = progress.data?.chapterId ?? null;
  // The chapter list is only asked for when the reader has a place to show
  // ("Chapter 4 · 31% read"). Same cache entry as the book page and reader.
  const chapters = useBookChapters(book?.id ?? "", reachedChapterId ? edition?.id ?? null : null);

  if (!book) return null;

  const pct = progress.data ? Math.round(progress.data.progress) : 0;
  const hasProgress = pct > 0;
  const reachedNumber = Number(chapters.data?.find((c) => c.id === reachedChapterId)?.number);
  const reachedChapter = Number.isFinite(reachedNumber) && reachedNumber > 0 ? reachedNumber : null;
  const readHref = edition
    ? `/read/${book.id}?edition=${edition.id}${progress.data?.chapterId ? `&chapter=${progress.data.chapterId}` : ""}`
    : `/books/${book.id}`;
  const readText = hasProgress ? t.book.continueReading : t.book.startReading;
  const category = book.categories[0]?.name;
  const languages = book.languages.map(languageLabel).join(" · ");

  return (
    <HeroAnnouncer slides={count} announcement={s.slideOf(book.title, safeIndex + 1, count)}>
      <section
        aria-label={m.featuredBooks}
        aria-roledescription={count > 1 ? "carousel" : undefined}
        className="group/hero under-bar relative isolate h-[clamp(600px,56vw,820px)] overflow-hidden bg-ground"
      >
        <div key={book.id} aria-hidden className="mq-settle absolute inset-0">
          <FallbackArt seed={book.title} variant="hero" />
        </div>
        <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />

        {/* The cover as a real book, on the right — desktop only. */}
        <Link
          key={`cover-${book.id}`}
          href={`/books/${book.id}`}
          aria-label={m.coverOf(book.title)}
          className="mq-rise absolute top-1/2 right-[clamp(56px,12vw,200px)] z-[1] block aspect-[5/7] w-[clamp(200px,18vw,280px)] -translate-y-[46%] overflow-hidden rounded-[4px_14px_14px_4px] bg-raised shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link max-desk:hidden"
        >
          <Artwork src={book.coverUrl} seed={book.title} variant="book" sizes="280px" priority zoomOnHover={false}>
            <span aria-hidden className="absolute top-[26px] right-[18px] left-[26px] text-[clamp(22px,2vw,30px)] leading-[1.08] font-black tracking-[-0.02em] text-white">
                {book.title}
              </span>
              <span aria-hidden className="absolute right-[18px] bottom-[22px] left-[26px] text-xs leading-4 font-bold tracking-[0.1em] text-white/85 uppercase">
              {book.author}
            </span>
          </Artwork>
        </Link>

        <div
          key={`copy-${book.id}`}
          className="mq-rise absolute right-[45%] bottom-[clamp(40px,5vw,80px)] left-gutter max-w-[640px] max-desk:right-gutter"
        >
          <div>
            <HeroTags>
              {isRecent(book.createdAt) && <Tag kind="new">{s.newTag}</Tag>}
              <Tag kind="age">{book.type === "PDF" ? t.book.formatPdf : t.book.formatEditor}</Tag>
              <span className="text-sm leading-5 font-semibold text-fg-body">
                {safeIndex === 0 ? t.media.bookOfTheWeek : t.media.newBooks}
              </span>
            </HeroTags>
            <HeroTitle>{book.title}</HeroTitle>
            <p className="mt-2.5 text-[17px] leading-6 text-fg-body">
              {t.book.byAuthor(book.author)}
            </p>
            <HeroMeta className="mt-2.5">
              <span>{t.book.chapterCount(edition?.chapterCount ?? 0)}</span>
              {category && <span>{category}</span>}
              {languages && <span>{languages}</span>}
            </HeroMeta>
            {book.description && <HeroSynopsis>{book.description}</HeroSynopsis>}
          </div>
          <HeroActions>
            <Link
              href={readHref}
              aria-label={m.titledAction(readText, book.title)}
              className={buttonVariants({ variant: "play", size: "hero" })}
            >
              <BookOpen size={20} strokeWidth={1.75} aria-hidden />
              {readText}
            </Link>
            <Link href={`/books/${book.id}`} className={buttonVariants({ variant: "tonal", size: "hero", className: "px-[22px] text-base font-bold" })}>
              <InfoIcon size={20} />
              {t.book.details}
            </Link>
            <Link
              href={authorHref(book.author)}
              aria-label={m.moreBy(book.author)}
              className={buttonVariants({ variant: "tonal", size: "icon-hero" })}
            >
              <PeopleIcon size={22} />
            </Link>
          </HeroActions>
          {hasProgress && (
            <div className="mt-4 flex max-w-[400px] items-center gap-3">
              <span aria-hidden className="h-[3px] flex-1 rounded-[2px] bg-white/22">
                <span className="block h-[3px] rounded-[2px] bg-crimson" style={{ width: `${pct}%` }} />
              </span>
              <span className="shrink-0 text-[13px] leading-[18px] text-fg-muted tabular-nums">
                {reachedChapter ? `${t.book.chapterOf(reachedChapter)} · ${s.percentRead(pct)}` : s.percentRead(pct)}
              </span>
            </div>
          )}
          {count > 1 && (
            <HeroPager
              count={count}
              index={safeIndex}
              onSelect={setIndex}
              onAdvance={() => setIndex((i) => (i + 1) % count)}
              label={m.featuredBooks}
              itemLabel={(i) => s.slideOf(books[i].title, i + 1, count)}
              className="mt-6"
            />
          )}
        </div>
      </section>
    </HeroAnnouncer>
  );
}

/* ═════════════════════════════ ALL BOOKS ═════════════════════════════ */


const AllBooks = forwardRef<
  HTMLElement,
  { categoryId: string | null; onCategoryChange: (id: string | null) => void }
>(function AllBooks({ categoryId, onCategoryChange }, ref) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  // The app's one search-timing policy (debounce, minimum length, stale
  // window), so the shelf searches exactly the way the catalogue does.
  const { term, setTerm, effectiveTerm, clear } = useSearchTerm();
  const [format, setFormat] = useState<"any" | BookType>("any");

  // Search and format run on the server, and the shelf pages through the
  // whole library as it scrolls (SHELF_PAGE_SIZE at a time). The category
  // chips filter the loaded pages, so re-chipping is instant and a chip never
  // leads nowhere.
  const queryClient = useQueryClient();
  const search = effectiveTerm || undefined;
  const type = format === "any" ? undefined : format;
  const unfiltered = !search && !type;
  const shelf = useBooksInfinite(
    { limit: SHELF_PAGE_SIZE, search, type },
    // With no search and no format, page 1 is the first SHELF_PAGE_SIZE books
    // of the hub's pool (same order, newest first), which is already loaded:
    // seed it from there instead of asking the server again.
    unfiltered
      ? {
          initialData: () => seedFromPool(queryClient.getQueryData<PaginatedResponse<Book>>(["books", POOL_QUERY])),
          initialDataUpdatedAt: () => queryClient.getQueryState(["books", POOL_QUERY])?.dataUpdatedAt,
        }
      : {},
  );
  // A picked category is also asked of the server (GET /books?categoryId=),
  // so a category whose books are older than the loaded pages — any of them
  // can be picked in the Categories overlay — still shows all of its books.
  // Until that answer is in, the loaded pages filtered here stand in for it.
  const picked = useBooksInfinite(
    { limit: SHELF_PAGE_SIZE, search, type, categoryId: categoryId ?? undefined },
    { enabled: categoryId !== null },
  );
  const books = useMemo(() => shelf.data?.pages.flatMap((page) => page.items) ?? [], [shelf.data]);
  const pickedBooks = useMemo(
    () =>
      categoryId !== null && picked.data && !picked.isPlaceholderData
        ? picked.data.pages.flatMap((page) => page.items)
        : null,
    [categoryId, picked.data, picked.isPlaceholderData],
  );
  // The query whose next page the scroll asks for: the server's category
  // answer once it is in, otherwise the whole shelf.
  const paging = pickedBooks !== null ? picked : shelf;
  // The honest count: the server's total for what is shown, or — while a
  // picked category's answer is still on its way — what the loaded pages hold.
  const serverTotal =
    pickedBooks !== null
      ? picked.data?.pages[0]?.total
      : categoryId === null && !shelf.isPlaceholderData
        ? shelf.data?.pages[0]?.total
        : undefined;
  const pickedPending = categoryId !== null && pickedBooks === null && !picked.isError;
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const book of books) for (const c of book.categories) seen.set(c.id, c.name);
    // The picked category keeps its chip even when none of its books is on this page.
    for (const book of pickedBooks ?? []) {
      for (const c of book.categories) if (c.id === categoryId && !seen.has(c.id)) seen.set(c.id, c.name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [books, pickedBooks, categoryId]);
  const filtered =
    pickedBooks ?? (categoryId ? books.filter((b) => b.categories.some((c) => c.id === categoryId)) : books);
  const waiting = shelf.isLoading || (pickedPending && filtered.length === 0);
  const isNarrowed = term.trim().length > 0 || categoryId !== null || format !== "any";

  const fetchNextPage = paging.fetchNextPage;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const showAll = () => {
    clear();
    setFormat("any");
    onCategoryChange(null);
  };

  return (
    <section
      ref={ref}
      id="all-books"
      aria-labelledby="h-all-books"
      tabIndex={-1}
      className="scroll-mt-[calc(var(--shell-bar-h,124px)+16px)] px-gutter outline-none"
    >
      <AllSectionHeader
        id="h-all-books"
        title={m.allBooks}
        count={waiting ? <span aria-hidden>—</span> : t.media.bookCount(serverTotal ?? filtered.length)}
        tools={
          <>
            <div className="relative w-[clamp(220px,22vw,300px)] max-desk:w-full">
              <label htmlFor="book-search" className="sr-only">
                {m.searchBooksLabel}
              </label>
              <SearchIcon size={18} className="pointer-events-none absolute top-[11px] left-4 text-fg-faint" />
              <input
                id="book-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") clear();
                }}
                placeholder={m.searchBooksPlaceholder}
                className="block h-10 w-full rounded-full border-0 bg-raised pr-[38px] pl-[42px] text-sm text-fg outline-none placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] [&::-webkit-search-cancel-button]:hidden"
              />
              {term && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label={t.browse.clearSearch}
                  className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg outline-none hover:bg-tonal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
            <SegmentedControl
              fit
              label={m.format}
              value={format}
              onChange={setFormat}
              options={[
                { value: "any", label: m.formatAny },
                { value: "EDITOR", label: t.book.formatEditor },
                { value: "PDF", label: t.book.formatPdf },
              ]}
            />
            <span className="inline-flex h-10 items-center px-1 text-sm font-semibold text-fg-faint max-desk:hidden">
              {m.newestFirst}
            </span>
          </>
        }
      />

      {categories.length > 0 && (
        <div role="group" aria-label={m.category} className="mq-rail -mx-gutter mt-[18px] flex gap-2 overflow-x-auto px-gutter">
          <FilterChip selected={categoryId === null} onClick={() => onCategoryChange(null)}>
            {t.media.allBookTypes}
          </FilterChip>
          {categories.map((option) => (
            <FilterChip
              key={option.id}
              selected={categoryId === option.id}
              onClick={() => onCategoryChange(categoryId === option.id ? null : option.id)}
            >
              {option.name}
            </FilterChip>
          ))}
        </div>
      )}

      {shelf.isError && books.length === 0 ? (
        <ErrorState className="pt-6" title={m.loadBooksFailed} description={s.errorBody} onRetry={() => void shelf.refetch()} />
      ) : !waiting && filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isNarrowed ? t.media.noBooksTitle : t.media.emptyLibraryTitle}
          description={isNarrowed ? m.noBooksBody : t.media.emptyLibraryBody}
          action={
            isNarrowed ? (
              <Button variant="play" size="cta" onClick={showAll}>
                {m.showAllBooks}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CardGrid
          kind="books"
          aria-busy={waiting || undefined}
          className={cn("mt-[22px] transition-opacity duration-200", shelf.isPlaceholderData && "opacity-60")}
        >
          {filtered.map((book, i) => (
            <ShelfBookCard key={book.id} book={book} priority={i < 8} showCategory />
          ))}
          {(waiting || paging.isFetchingNextPage) && (
            <GridLoadingMore kind="book" count={waiting ? 16 : 8} label={m.loadingBooks} />
          )}
        </CardGrid>
      )}
      {!waiting && filtered.length > 0 && (
        <InfiniteSentinel
          hasNextPage={paging.hasNextPage}
          isFetchingNextPage={paging.isFetchingNextPage}
          onLoadMore={loadMore}
        />
      )}
    </section>
  );
});

/** Page 1 of the unfiltered shelf, cut from the hub's pool (or nothing when the pool is not cached). */
function seedFromPool(pool: PaginatedResponse<Book> | undefined): BooksInfiniteData | undefined {
  if (!pool) return undefined;
  return {
    pages: [{ ...pool, items: pool.items.slice(0, SHELF_PAGE_SIZE), page: 1, limit: SHELF_PAGE_SIZE }],
    pageParams: [1],
  };
}

/* ═══════════════════════════════ GUESTS ═══════════════════════════════ */

function GuestShelf() {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const seeds = ["Golden Thread", "Monsoon Letters", "The Teak House", "River Songs", "Night Market", "Paper Kites"];
  return (
    <section
      aria-labelledby="h-books-guest"
      className="flex flex-col items-center px-gutter pt-[clamp(96px,10vw,160px)] pb-20 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-tonal-faint text-fg-muted">
        <BookOpen size={28} strokeWidth={1.75} aria-hidden />
      </span>
      <h1 id="h-books-guest" className="mt-[18px] text-[clamp(26px,2.4vw,32px)] leading-[1.2] font-black tracking-[-0.02em] text-fg [&:lang(my)]:tracking-normal">
        {t.browse.booksSignInTitle}
      </h1>
      <p className="mt-2 max-w-[420px] text-[15px] leading-[23px] text-fg-muted">{t.browse.booksSignInBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={loginHref("/media/books")} className={buttonVariants({ variant: "play", size: "cta", className: "px-7" })}>
          {t.browse.signIn}
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "tonal", size: "cta" })}>
          {m.createAccount}
        </Link>
      </div>
      <div aria-hidden className="mt-14 grid grid-cols-[repeat(6,minmax(0,120px))] gap-4 opacity-35 max-desk:grid-cols-3">
        {seeds.map((seed) => (
          <span key={seed} className="relative block aspect-[5/7] overflow-hidden rounded-[3px_10px_10px_3px]">
            <FallbackArt seed={seed} variant="book" />
          </span>
        ))}
      </div>
    </section>
  );
}
