"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { CloseBookIcon, ReaderSearchIcon } from "./reader-icons";
import { bookService } from "@/services/api/bookService";
import type { BookChapterSummary } from "@/types/book";
import {
  SEARCH_MIN_QUERY_LENGTH,
  getBlocksCached,
  searchBook,
  type ReaderSearchMatch,
} from "./reader-search";
import { composeChapterDoc } from "./chapter-sections";

/**
 * The Search tab of the text reader's contents drawer.
 *
 * UI only — extraction/matching live in reader-search.ts. Chapters are pulled
 * through the SAME react-query key/fn the reader itself uses, so a search
 * warms the reading cache: jumping to a result opens a chapter that is
 * already in memory.
 */

const DEBOUNCE_MS = 300;

export function ReaderSearch({
  bookId,
  editionId,
  chapters,
  active,
  /** Bumped by the `/` shortcut — refocus even when the tab is already open. */
  focusSignal,
  onJump,
}: {
  bookId: string;
  editionId: string;
  chapters: BookChapterSummary[];
  active: boolean;
  focusSignal?: number;
  onJump: (match: ReaderSearchMatch) => void;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const p = useSection(playText);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    "idle" | "tooShort" | "searching" | "done"
  >("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ReaderSearchMatch[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const blocksCache = useRef(new Map<string, string[]>());
  /** Generation counter — every keystroke supersedes the run before it. */
  const generation = useRef(0);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active, focusSignal]);

  // The edition owns the chapters — switching language invalidates both the
  // extracted-text cache and any in-flight run.
  useEffect(() => {
    blocksCache.current = new Map();
    generation.current += 1;
    /* eslint-disable react-hooks/set-state-in-effect -- reset on edition switch */
    setResults([]);
    setStatus("idle");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [editionId]);

  useEffect(() => {
    const gen = ++generation.current;
    const trimmed = query.trim();
    /* eslint-disable react-hooks/set-state-in-effect -- immediate feedback for empty / too-short queries */
    if (trimmed.length === 0) {
      setStatus("idle");
      setResults([]);
      return;
    }
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setStatus("tooShort");
      setResults([]);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const timer = setTimeout(async () => {
      if (generation.current !== gen) return;
      setStatus("searching");
      setResults([]);
      setProgress({ done: 0, total: chapters.length });

      const matches = await searchBook({
        query: trimmed,
        chapters,
        loadBlocks: async (chapterId) => {
          const chapter = await queryClient.fetchQuery({
            // useBookChapter's exact key/fn — search warms the reader cache.
            queryKey: ["book", bookId, "edition", editionId, "chapter", chapterId],
            queryFn: ({ signal }) =>
              bookService.getChapter(bookId, editionId, chapterId, { signal }),
            staleTime: 5 * 60_000,
          });
          // The composed document, so text inside sections is searchable
          // and a hit's blockIndex lands in the same space the reader
          // renders. Identity for a section-less chapter.
          return getBlocksCached(
            blocksCache.current,
            chapterId,
            composeChapterDoc(chapter).doc,
          );
        },
        onProgress: (done, total, count) => {
          if (generation.current !== gen) return;
          setProgress({ done, total });
          void count;
        },
        isCancelled: () => generation.current !== gen,
      });

      if (generation.current !== gen) return;
      setResults(matches);
      setStatus("done");
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, chapters, bookId, editionId, queryClient]);

  const grouped = useMemo(() => {
    const groups: { chapterId: string; title: string; matches: ReaderSearchMatch[] }[] =
      [];
    for (const match of results) {
      const last = groups[groups.length - 1];
      if (last && last.chapterId === match.chapterId) {
        last.matches.push(match);
      } else {
        groups.push({
          chapterId: match.chapterId,
          title:
            chapters.find((c) => c.id === match.chapterId)?.title ??
            t.book.chapterOf(match.chapterIndex + 1),
          matches: [match],
        });
      }
    }
    return groups;
  }, [results, chapters, t]);

  const statusLine =
    status === "tooShort"
      ? r.searchTooShort
      : status === "searching"
        ? `${r.searching} ${progress.done}/${progress.total}`
        : status === "done"
          ? results.length === 0
            ? r.searchNoResults
            : r.searchCount(results.length)
          : null;

  return (
    <div className="flex flex-col">
      <div className="relative mx-1 mt-1">
        <ReaderSearchIcon
          size={20}
          className="pointer-events-none absolute top-3.5 left-3.5 text-fg-faint"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={r.searchPlaceholder}
          aria-label={r.searchInBook}
          className="block h-12 w-full rounded-[12px] border-0 bg-raised px-11 text-base text-fg outline-none placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] [&::-webkit-search-cancel-button]:hidden"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={p.clearSearch}
            className="focus-ring absolute top-1.5 right-1.5 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg-muted transition-colors hover:bg-tonal-ghost hover:text-fg"
          >
            <CloseBookIcon size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <p role="status" className="mx-2 mt-3 mb-1 text-[13px] leading-[18px] font-bold text-fg-faint tabular-nums empty:hidden">
        {statusLine}
      </p>

      {grouped.map((group) => (
        <section key={group.chapterId} className="mt-1">
          <p className="m-0 truncate px-2 pt-1.5 text-[12px] leading-4 font-bold text-fg-faint">{group.title}</p>
          <div>
            {group.matches.map((match) => (
              <button
                key={`${match.chapterId}:${match.occurrenceInChapter}`}
                type="button"
                onClick={() => onJump(match)}
                className="focus-ring block w-full cursor-pointer rounded-[10px] border-0 bg-transparent px-2 py-2.5 text-left text-sm leading-5 text-fg-body transition-colors hover:bg-tonal-ghost"
              >
                {match.before}
                <mark className="rounded-[3px] bg-crimson/28 px-0.5 text-fg">{match.term}</mark>
                {match.after}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
