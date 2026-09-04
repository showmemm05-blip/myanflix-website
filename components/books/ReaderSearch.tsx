"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/context/language-context";
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

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          style={{ color: "var(--ink-faint)" }}
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={r.searchPlaceholder}
          aria-label={r.searchInBook}
          className="focus-ring w-full rounded-lg py-2 pr-2.5 pl-8 text-sm"
          style={{
            background: "color-mix(in oklab, var(--ink) 6%, transparent)",
            border: "1px solid var(--rule)",
            color: "var(--ink)",
          }}
        />
      </div>

      {status === "tooShort" && (
        <p className="px-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          {r.searchTooShort}
        </p>
      )}

      {status === "searching" && (
        <p className="px-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          {r.searching}{" "}
          <span className="nums">
            {progress.done}/{progress.total}
          </span>
        </p>
      )}

      {status === "done" && (
        <p className="px-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          {results.length === 0 ? r.searchNoResults : r.searchCount(results.length)}
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.chapterId}>
          <p
            className="font-reading truncate px-1 pb-1 text-xs font-semibold"
            style={{ color: "var(--ink-soft)" }}
          >
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.matches.map((match) => (
              <button
                key={`${match.chapterId}:${match.occurrenceInChapter}`}
                type="button"
                onClick={() => onJump(match)}
                className="focus-ring w-full rounded-lg px-2 py-1.5 text-left text-xs leading-relaxed transition-colors"
                style={{ color: "var(--ink-soft)" }}
              >
                {match.before}
                <mark
                  className="rounded-sm"
                  style={{
                    background: "var(--hl-yellow)",
                    color: "inherit",
                    padding: 0,
                  }}
                >
                  {match.term}
                </mark>
                {match.after}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
