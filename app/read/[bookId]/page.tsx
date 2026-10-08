"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { BookGlyph } from "@/components/books/reader-icons";
import { PageLoader } from "@/components/loading/Spinner";
import { useLanguage } from "@/lib/context/language-context";
import { useBook, useBookChapters } from "@/hooks/use-books";
import { loadPreferredLanguage, pickEdition } from "@/lib/books/languages";

// Each book opens only ONE of the two readers, so each is its own download:
// a PDF book never fetches the text reader's editor engine (TipTap /
// ProseMirror, ~136 KB gzipped), and a text book never fetches the page
// reader. The same spinner covers the moment the reader's code arrives.
const ChapterReader = dynamic(
  () => import("@/components/books/ChapterReader").then((mod) => mod.ChapterReader),
  { loading: () => <PageLoader /> },
);
const PageReader = dynamic(
  () => import("@/components/books/PageReader").then((mod) => mod.PageReader),
  { loading: () => <PageLoader /> },
);

/**
 * The reader route decides three things and nothing else: WHICH LANGUAGE,
 * WHICH CHAPTER, and which of the two readers.
 *
 * The chapter is the unit of content for both kinds of book now — a written
 * chapter is its text, a PDF chapter is its own converted release — so the
 * chapter list is resolved here, once, rather than differently in each
 * reader. What stays split is the reading experience itself: one paginates
 * flowing text, the other windows a few hundred images, so there is no
 * shared reader shell to inherit from and building one would mean a
 * component that is bad at both.
 */
export default function ReadBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const { data: book, isLoading } = useBook(bookId);

  const requestedEditionId = searchParams.get("edition");

  /**
   * `?edition=` wins (that is what every link from the book page carries),
   * then the reader's standing language preference, then whatever the book
   * has. An edition id that is not on this book — a stale link, or one for a
   * language since unpublished — falls through to the same resolution rather
   * than 404ing a book the reader can perfectly well read.
   */
  const edition = useMemo(() => {
    if (!book) return null;
    const requested = book.editions.find((e) => e.id === requestedEditionId);
    return requested ?? pickEdition(book.editions, loadPreferredLanguage());
  }, [book, requestedEditionId]);

  // Fetched here so the chapter can be resolved before either reader mounts;
  // both readers ask for the same list, and react-query hands them this very
  // cache entry rather than a second request.
  const { data: chapters, isLoading: loadingChapters } = useBookChapters(
    bookId,
    edition?.id ?? null,
  );

  const requestedChapterId = searchParams.get("chapter");

  /**
   * `?chapter=` names the chapter — but only if this edition still has it.
   * A link kept from another language, or to a chapter withdrawn since, must
   * fall through to the reader's own resolution (the saved bookmark, then
   * the first chapter) rather than open the book on nothing.
   */
  const initialChapterId = useMemo(() => {
    if (!requestedChapterId || !chapters) return null;
    return chapters.some((c) => c.id === requestedChapterId)
      ? requestedChapterId
      : null;
  }, [chapters, requestedChapterId]);

  /**
   * `?section=` names a section of THAT chapter — checked against the
   * chapter's own sections, so a link to a section since removed (or one
   * belonging to another chapter) simply opens the chapter from the top.
   */
  const requestedSectionId = searchParams.get("section");
  const initialSectionId = useMemo(() => {
    if (!requestedSectionId || !initialChapterId || !chapters) return null;
    const chapter = chapters.find((c) => c.id === initialChapterId);
    return chapter?.sections?.some((s) => s.id === requestedSectionId)
      ? requestedSectionId
      : null;
  }, [chapters, initialChapterId, requestedSectionId]);

  // Waiting for the list here, not in the readers, is what lets a reader
  // mount already knowing its chapter — and stops the "nothing to read yet"
  // state from flashing over a book that is merely still loading.
  if (isLoading || loadingChapters) return <PageLoader />;

  if (!book || !edition) {
    return (
      // The reader has no app shell, so this sits on the plain ground.
      <div className="flex min-h-[100dvh] items-center justify-center bg-ground px-gutter py-24">
        <EmptyState
          icon={BookGlyph}
          title={t.book.notFoundTitle}
          description={t.book.notFoundBody}
          headingLevel="h2"
          action={
            <Link href="/media/books" className={buttonVariants({ variant: "play", size: "cta" })}>
              {t.book.backToLibrary}
            </Link>
          }
        />
      </div>
    );
  }

  return book.type === "EDITOR" ? (
    <ChapterReader
      book={book}
      edition={edition}
      initialChapterId={initialChapterId}
      initialSectionId={initialSectionId}
    />
  ) : (
    <PageReader
      book={book}
      edition={edition}
      initialChapterId={initialChapterId}
      // A page within that chapter — page numbers restart in every one.
      initialPage={Number(searchParams.get("page")) || null}
    />
  );
}
