"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Search,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { ChapterContent } from "./ChapterContent";
import {
  ContentsDrawer,
  ContentsToggle,
  ReaderBar,
  ReaderButton,
  ReaderDimOverlay,
  useReaderChrome,
  type ContentsDrawerTab,
} from "./ReaderChrome";
import { ReaderSettingsPanel } from "./ReaderSettingsPanel";
import { DEFAULT_READER_SETTINGS, hasMyanmar, LINE_HEIGHT_VALUE, loadReaderSettings, READER_FONT_CLASS, READER_MARGIN_CLASS, READER_THEME_CLASS, READER_WIDTH_CLASS, saveReaderSettings, type ReaderSettingsV2 } from "./reader-settings";
import { useAnnotations } from "./reader-annotations";
import {
  chapterMinutesCached,
  minutesLeft,
} from "./reading-time";
import { ChapterPaginator, type ChapterPaginatorHandle } from "./ChapterPaginator";
import { SelectionAnnotator, wrapBlockRange } from "./SelectionAnnotator";
import { ReaderSearch } from "./ReaderSearch";
import type { ReaderSearchMatch } from "./reader-search";
import { composeChapterDoc, sectionIdAtDepth } from "./chapter-sections";
import { useFullscreen } from "./use-fullscreen";
import { useWakeLock } from "./use-wake-lock";
import { ShortcutsHelp } from "./reader-shortcuts";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import {
  readingProgressKey,
  useBookChapter,
  useBookChapters,
  useBookContents,
  useReadingProgress,
} from "@/hooks/use-books";
import { bookService } from "@/services/api/bookService";
import { cn } from "@/lib/utils";
import type {
  BookChapter,
  BookChapterSummary,
  BookDetail,
  BookEdition,
} from "@/types/book";

/** Matches the player's cadence — see app/player/[movieId]/page.tsx. */
const PROGRESS_SAVE_INTERVAL_MS = 8000;

/** What a drawer/search tap asks the reader to do once the chapter is ready. */
type PendingJump = { chapterId: string } & (
  | { kind: "depth"; depth: number }
  | { kind: "anno"; id: string; blockIndex: number }
  | { kind: "search"; match: ReaderSearchMatch }
  /** A section heading — resolved to its block index once the chapter is composed. */
  | { kind: "section"; sectionId: string }
);

/**
 * THE CHAPTER READER — editor books.
 *
 * A reading column (continuous or paginated), a tabbed contents drawer
 * (contents / bookmarks / notes / search), selection highlights, and the full
 * v2 settings surface. Progress is chapter granularity plus scroll depth
 * within the chapter, saved on the player's throttle-plus-unmount pattern so
 * a closed tab never loses the place — the paginated mode maps page/pages
 * onto the SAME depth number, so the save shape never changes.
 */
export function ChapterReader({
  book,
  edition,
  initialChapterId,
  initialSectionId = null,
}: {
  book: BookDetail;
  /** The LANGUAGE being read — chapters belong to it, not to the book. */
  edition: BookEdition;
  initialChapterId: string | null;
  /** A section of that chapter linked to directly (`?section=`); lands on its heading. */
  initialSectionId?: string | null;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isAuthed = Boolean(user);

  const { data: chapters = [] } = useBookChapters(book.id, edition.id);
  // The numbered tree the contents tab renders from; the flat list above
  // stays the source of prev/next. Until it arrives the tab shows the flat
  // list, exactly as it always has.
  const { data: contents } = useBookContents(book.id, edition.id);
  const { data: savedProgress, isLoading: loadingProgress } =
    useReadingProgress(book.id, edition.id, isAuthed);

  const [chapterId, setChapterId] = useState<string | null>(initialChapterId);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("contents");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [selectionActive, setSelectionActive] = useState(false);
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1 });
  /** Chapter depth mirrored into state (coarsely) for the % / min-left label. */
  const [depthState, setDepthState] = useState(0);

  const articleRef = useRef<HTMLElement>(null);
  /** Relative wrapper around the content in BOTH modes — the annotation/
      selection overlays and every [data-block-index] query hang off it. */
  const contentWrapRef = useRef<HTMLDivElement>(null);
  const paginatorRef = useRef<ChapterPaginatorHandle>(null);
  const settingsWrapRef = useRef<HTMLDivElement>(null);
  const minutesCache = useRef(new Map<string, number>());

  // ---- Settings (v2, per user) ------------------------------------------

  // Read after mount so the server and first client render agree, re-read on
  // login/logout — the store carries anon → user migration itself.
  const [settings, setSettings] = useState<ReaderSettingsV2>(
    DEFAULT_READER_SETTINGS,
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadReaderSettings(user?.id));
  }, [user?.id]);

  const paginated = settings.textPageMode === "paginated";

  /** Depth the NEXT paginator mount opens at (chapter turn = 0, mode switch =
      the depth being left, bookmark jump = the bookmark). A ref because it is
      only ever read once, during the paginator's mount. */
  const paginatorSeedDepth = useRef(0);

  const changeSettings = useCallback(
    (patch: Partial<ReaderSettingsV2>) => {
      setSettings((prev) => {
        // Switching reading mode must keep the reader's place: seed the
        // incoming paginator with the depth the scroll mode reached.
        if (
          patch.textPageMode !== undefined &&
          patch.textPageMode !== prev.textPageMode
        )
          paginatorSeedDepth.current = scrollDepth.current;
        const next = { ...prev, ...patch };
        saveReaderSettings(user?.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const fullscreen = useFullscreen();
  useWakeLock(settings.keepAwake);

  // The bars stay up while any panel (or a live selection) is open.
  const { visible: chromeVisible } = useReaderChrome(
    contentsOpen || settingsOpen || shortcutsOpen || selectionActive,
    { autoHide: settings.autoHideChrome },
  );

  // ---- Chapter resolution -----------------------------------------------

  /** Set once before the first chapter renders; consumed at contentReady.
      A `?section=` link seeds it, so the first landing is the heading. */
  const pendingJump = useRef<PendingJump | null>(
    initialChapterId && initialSectionId
      ? { chapterId: initialChapterId, kind: "section", sectionId: initialSectionId }
      : null,
  );
  const [jumpTick, setJumpTick] = useState(0);

  /**
   * Resolve the opening chapter once: an explicit ?chapter= wins, then the
   * saved bookmark, then the first chapter. Waiting for the progress query
   * is what makes "continue reading" actually resume — including the DEPTH
   * within the chapter, recovered from the whole-book % the save wrote.
   */
  useEffect(() => {
    if (chapterId || chapters.length === 0) return;
    // Until AuthProvider has resolved the profile, `user` is null and a
    // signed-in reader would be opened at chapter 1 instead of their
    // bookmark.
    if (authLoading) return;
    if (isAuthed && loadingProgress) return;
    const savedId = savedProgress?.chapterId;
    const saved = savedId && chapters.some((c) => c.id === savedId);
    const id = saved ? savedId! : chapters[0].id;
    if (saved && typeof savedProgress?.progress === "number") {
      // progress = perChapter * (index + depth)  ⇒  invert for depth.
      const perChapter = 100 / chapters.length;
      const idx = chapters.findIndex((c) => c.id === savedId);
      const depth = Math.min(
        1,
        Math.max(0, savedProgress.progress / perChapter - idx),
      );
      if (depth > 0.01 && depth < 0.99) {
        pendingJump.current = { chapterId: id, kind: "depth", depth };
        paginatorSeedDepth.current = depth;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChapterId(id);
  }, [
    chapterId,
    chapters,
    authLoading,
    isAuthed,
    loadingProgress,
    savedProgress,
  ]);

  const index = chapters.findIndex((c) => c.id === chapterId);
  const previous = index > 0 ? chapters[index - 1] : null;
  const next =
    index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;

  const {
    data: chapter,
    isLoading: loadingChapter,
    error,
  } = useBookChapter(book.id, edition.id, chapterId);

  /** True only once the article holds real text rather than the skeleton. */
  const contentReady = !loadingChapter && !error && Boolean(chapter);

  /**
   * The chapter's document with its sections composed in after it. For a
   * chapter with no sections this IS `chapter.content` (same object), so
   * block indices, highlights, search and minutes are untouched for every
   * existing book; the anchors are where each section's heading landed.
   */
  const composed = useMemo(
    () => composeChapterDoc(chapter ?? { content: null, sections: [] }),
    [chapter],
  );

  // ---- Progress ---------------------------------------------------------

  const lastSavedAt = useRef(0);
  const scrollDepth = useRef(0);

  const reportDepth = useCallback((depth: number) => {
    scrollDepth.current = depth;
    // Coarse mirror for the folio label — no re-render per scrolled pixel.
    setDepthState((prev) => (Math.abs(prev - depth) < 0.005 ? prev : depth));
  }, []);

  /**
   * Overall progress = chapters finished + how far into this one, so the
   * number means "through the book", not "down this page".
   */
  const computeProgress = useCallback(() => {
    if (chapters.length === 0 || index < 0) return 0;
    const perChapter = 100 / chapters.length;
    return Math.min(100, perChapter * (index + scrollDepth.current));
  }, [chapters.length, index]);

  const saveProgress = useCallback(
    (force = false) => {
      if (!isAuthed || !chapterId) return;
      const now = Date.now();
      if (!force && now - lastSavedAt.current < PROGRESS_SAVE_INTERVAL_MS)
        return;
      lastSavedAt.current = now;
      // The section the reader is in, when the chapter has any — the key is
      // omitted otherwise, so a section-less book sends the body it always did.
      const sectionId = sectionIdAtDepth(
        composed.anchors,
        scrollDepth.current,
        composed.doc?.content?.length ?? 0,
      );
      // Deliberately swallowed, like the player's: a failed bookmark must
      // never interrupt reading.
      void bookService
        .updateReadingProgress(book.id, edition.id, {
          chapterId,
          progress: computeProgress(),
          ...(sectionId ? { sectionId } : {}),
        })
        // useReadingProgress is staleTime: Infinity on purpose, so the
        // cache must be updated here or a second visit this session
        // resumes at a stale chapter. See PageReader for the same note.
        .then((updated) =>
          queryClient.setQueryData(
            readingProgressKey(book.id, edition.id),
            updated,
          ),
        )
        .catch(() => {});
    },
    [
      isAuthed,
      chapterId,
      book.id,
      edition.id,
      computeProgress,
      queryClient,
      composed,
    ],
  );

  // Scroll depth within the chapter, measured off the article box rather
  // than the window so the header/footer chrome doesn't skew it. In
  // paginated mode the paginator reports depth instead and the article ref
  // is null, so the listener no-ops — but the RESET below still runs on
  // every chapter change, in both modes.
  useEffect(() => {
    // Setup order matters: this runs after the previous chapter's cleanup
    // has force-saved, so zeroing here can no longer corrupt that save.
    scrollDepth.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepthState(0);
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      // While the chapter is still loading the article holds a skeleton
      // shorter than the viewport; measuring then would record "read to the
      // end" for a chapter nobody has seen. contentReady in the deps
      // re-runs this on the commit that renders the real text.
      if (!contentReady) return;
      const start = el.offsetTop;
      const height = el.offsetHeight - window.innerHeight;
      if (height <= 0) {
        reportDepth(1);
        return;
      }
      reportDepth(
        Math.min(1, Math.max(0, (window.scrollY - start) / height)),
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapterId, contentReady, reportDepth]);

  useEffect(() => {
    if (!isAuthed) return;
    const timer = setInterval(() => saveProgress(), PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthed, saveProgress]);

  // Force-save when the chapter changes or the reader closes.
  const forceSave = useRef(saveProgress);
  useEffect(() => {
    forceSave.current = saveProgress;
  });
  useEffect(() => {
    return () => forceSave.current(true);
  }, [chapterId]);

  const goTo = useCallback(
    (id: string) => {
      // Save the chapter being left, at the depth actually reached.
      //
      // scrollDepth is deliberately NOT reset here: React runs the
      // [chapterId] cleanup below on the next commit, which force-saves the
      // OUTGOING chapter once more — with a zeroed depth that would
      // overwrite this correct save with 0%. The reset belongs in the effect
      // that sets up for the new chapter, which runs after that cleanup.
      saveProgress(true);
      paginatorSeedDepth.current = 0;
      setChapterId(id);
      setContentsOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [saveProgress],
  );

  // ---- Mode switch: keep the place --------------------------------------

  // paginated → scroll: the article remounts, so put the window where the
  // page number said we were. (scroll → paginated is handled by the seed
  // depth the paginator mounts with.)
  const prevMode = useRef(settings.textPageMode);
  useEffect(() => {
    if (prevMode.current === settings.textPageMode) return;
    prevMode.current = settings.textPageMode;
    if (settings.textPageMode !== "scroll") return;
    const depth = scrollDepth.current;
    requestAnimationFrame(() => {
      const el = articleRef.current;
      if (!el) return;
      const height = el.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: el.offsetTop + Math.max(0, height * depth),
        behavior: "instant",
      });
    });
  }, [settings.textPageMode]);

  // ---- Annotations -------------------------------------------------------

  const annos = useAnnotations(user?.id, book.id);

  /** The toolbar toggle is "pressed" when a bookmark matches this position. */
  const currentBookmark = useMemo(
    () =>
      annos.bookmarks.find(
        (b) =>
          b.editionId === edition.id &&
          b.chapterId === chapterId &&
          b.pageNumber === undefined &&
          Math.abs((b.pct ?? 0) - depthState) < 0.02,
      ),
    [annos.bookmarks, edition.id, chapterId, depthState],
  );

  const toggleBookmark = useCallback(() => {
    if (!chapterId) return;
    if (currentBookmark) {
      annos.removeBookmark(currentBookmark.id);
      return;
    }
    const result = annos.addBookmark({
      editionId: edition.id,
      chapterId,
      pct: scrollDepth.current,
      excerpt: chapter?.title,
    });
    if (!result.ok && result.reason === "limit") toast(r.annotationLimit);
  }, [chapterId, currentBookmark, annos, edition.id, chapter?.title, r]);

  // ---- Jumps (bookmarks / notes / search results) ------------------------

  const jumpTo = useCallback(
    (jump: PendingJump) => {
      pendingJump.current = jump;
      if (jump.kind === "depth") paginatorSeedDepth.current = jump.depth;
      if (jump.chapterId !== chapterId) {
        goTo(jump.chapterId);
        // goTo zeroes the seed for a plain chapter turn — a depth jump wants
        // its own landing depth back.
        if (jump.kind === "depth") paginatorSeedDepth.current = jump.depth;
      } else {
        setContentsOpen(false);
        setJumpTick((n) => n + 1);
      }
    },
    [chapterId, goTo],
  );

  /** One-shot search flash: unwrap-on-timeout, superseded by the next jump. */
  const flashCleanup = useRef<(() => void) | null>(null);
  const applySearchFlash = useCallback(
    (block: Element, match: ReaderSearchMatch): Element => {
      flashCleanup.current?.();
      const text = block.textContent ?? "";
      const hay = text.toLowerCase();
      const needle = match.term.toLowerCase();
      // The engine's offsets were measured on a space-joined extraction that
      // can drift a few characters from the DOM's textContent — so anchor on
      // the occurrence NEAREST the reported offset instead of trusting it.
      let best = -1;
      let from = 0;
      for (;;) {
        const idx = hay.indexOf(needle, from);
        if (idx === -1) break;
        if (best === -1 || Math.abs(idx - match.start) < Math.abs(best - match.start))
          best = idx;
        from = idx + 1;
      }
      let marks: HTMLElement[] = [];
      if (best !== -1)
        marks = wrapBlockRange(block, best, best + needle.length, (m) => {
          m.className = "reader-search-flash";
        });
      const unwrap = () => {
        for (const m of marks) {
          const parent = m.parentNode;
          if (!parent) continue;
          while (m.firstChild) parent.insertBefore(m.firstChild, m);
          parent.removeChild(m);
          parent.normalize();
        }
      };
      const timer = setTimeout(() => {
        unwrap();
        flashCleanup.current = null;
      }, 4000);
      flashCleanup.current = () => {
        clearTimeout(timer);
        unwrap();
        flashCleanup.current = null;
      };
      return marks[0] ?? block;
    },
    [],
  );

  // Consume the pending jump once the target chapter's text is on screen.
  // Runs after the annotator's paint effect (child effects first), so a
  // note's <mark> already exists to scroll to.
  useEffect(() => {
    const jump = pendingJump.current;
    if (!jump || !contentReady || jump.chapterId !== chapterId) return;
    pendingJump.current = null;
    const container = contentWrapRef.current;

    const land = (el: Element | null) => {
      if (!el) return;
      if (paginated) paginatorRef.current?.goToElement(el);
      else el.scrollIntoView({ block: "center" });
    };

    if (jump.kind === "depth") {
      if (paginated) {
        // If the paginator has already measured this corrects immediately;
        // if not, the seed depth it mounted with lands the same place.
        paginatorRef.current?.goToDepth(jump.depth);
      } else {
        const el = articleRef.current;
        if (el) {
          const height = el.offsetHeight - window.innerHeight;
          window.scrollTo({
            top: el.offsetTop + Math.max(0, height * jump.depth),
            behavior: "instant",
          });
        }
      }
      return;
    }
    if (!container) return;
    if (jump.kind === "anno") {
      land(
        container.querySelector(
          `mark.reader-highlight[data-anno-id="${CSS.escape(jump.id)}"]`,
        ) ??
          container.querySelector(`[data-block-index="${jump.blockIndex}"]`),
      );
      return;
    }
    if (jump.kind === "section") {
      // The heading block composeChapterDoc appended for this section.
      const anchor = composed.anchors.find(
        (a) => a.sectionId === jump.sectionId,
      );
      if (!anchor) return;
      land(
        container.querySelector(`[data-block-index="${anchor.blockIndex}"]`),
      );
      return;
    }
    // Search result: flash the term, then land on the flash.
    const block = container.querySelector(
      `[data-block-index="${jump.match.blockIndex}"]`,
    );
    if (!block) return;
    land(applySearchFlash(block, jump.match));
  }, [contentReady, chapterId, jumpTick, paginated, applySearchFlash, composed]);

  // ---- Keyboard ----------------------------------------------------------

  const openSearch = useCallback(() => {
    setDrawerTab("search");
    setContentsOpen(true);
    setSearchFocusSignal((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      // Never fight browser/OS chords (ctrl+wheel zoom is the pages reader's).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "?":
          setShortcutsOpen(true);
          return;
        case "Escape":
          // Open panels close themselves on their own Escape listeners; when
          // nothing is open, Escape leaves fullscreen.
          if (
            !contentsOpen &&
            !settingsOpen &&
            !shortcutsOpen &&
            fullscreen.active
          )
            fullscreen.toggle();
          return;
        case "t":
        case "T":
          setContentsOpen((o) => !o);
          return;
        case "b":
        case "B":
          toggleBookmark();
          return;
        case "s":
        case "S":
          setSettingsOpen((o) => !o);
          return;
        case "f":
        case "F":
          fullscreen.toggle();
          return;
        case "/":
          e.preventDefault();
          openSearch();
          return;
        case "ArrowLeft":
          if (e.shiftKey || !paginated) {
            if (previous) goTo(previous.id);
          } else paginatorRef.current?.prev();
          return;
        case "ArrowRight":
          if (e.shiftKey || !paginated) {
            if (next) goTo(next.id);
          } else paginatorRef.current?.next();
          return;
      }

      if (!paginated) return; // scroll mode: native Space/Home/End untouched
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (e.shiftKey) paginatorRef.current?.prev();
          else paginatorRef.current?.next();
          return;
        case "PageDown":
          e.preventDefault();
          paginatorRef.current?.next();
          return;
        case "PageUp":
          e.preventDefault();
          paginatorRef.current?.prev();
          return;
        case "Home":
          e.preventDefault();
          paginatorRef.current?.first();
          return;
        case "End":
          e.preventDefault();
          paginatorRef.current?.last();
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    previous,
    next,
    goTo,
    paginated,
    toggleBookmark,
    openSearch,
    contentsOpen,
    settingsOpen,
    shortcutsOpen,
    fullscreen,
  ]);

  // ---- Reading time ------------------------------------------------------

  const chapterMinutes =
    chapterId && composed.doc
      ? chapterMinutesCached(minutesCache.current, chapterId, composed.doc)
      : 0;
  const minsLeft = minutesLeft(chapterMinutes, depthState);
  const overallPct =
    chapters.length > 0 && index >= 0
      ? Math.min(
          100,
          Math.round((100 / chapters.length) * (index + depthState)),
        )
      : 0;

  /** "~N min" for a contents row — only when the chapter is already cached
      (estimates never justify fetching the whole book). */
  const cachedChapterMinutes = useCallback(
    (id: string): number | null => {
      const data = queryClient.getQueryData<BookChapter>([
        "book",
        book.id,
        "edition",
        edition.id,
        "chapter",
        id,
      ]);
      if (!data?.content) return null;
      // Composed, so a chapter's sections count towards its estimate.
      return chapterMinutesCached(
        minutesCache.current,
        id,
        composeChapterDoc(data).doc,
      );
    },
    [queryClient, book.id, edition.id],
  );

  // ---- Drawer tabs -------------------------------------------------------

  const contentsList = useMemo(() => {
    /** One chapter row — the same markup whichever list it sits in. */
    const chapterRow = (c: BookChapterSummary, label: string) => {
      const current = c.id === chapterId;
      const minutes = cachedChapterMinutes(c.id);
      return (
        <button
          key={c.id}
          type="button"
          onClick={() => goTo(c.id)}
          className="focus-ring flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition-colors"
          style={{
            background: current
              ? "color-mix(in oklab, var(--ink) 8%, transparent)"
              : "transparent",
            color: current ? "var(--ink)" : "var(--ink-soft)",
          }}
        >
          <span
            className="w-5 shrink-0 text-xs nums"
            style={{ color: "var(--ink-faint)" }}
          >
            {label}
          </span>
          <span className="font-reading min-w-0 flex-1 text-[0.95rem] leading-snug">
            {c.title}
          </span>
          {minutes !== null && minutes > 0 && (
            <span
              className="shrink-0 text-[11px] nums"
              style={{ color: "var(--ink-faint)" }}
            >
              {r.estMinutes(minutes)}
            </span>
          )}
        </button>
      );
    };

    // Until the numbered tree arrives, the flat list — exactly as before.
    if (!contents) {
      return (
        <nav className="space-y-0.5">
          {chapters.map((c, i) => chapterRow(c, String(i + 1)))}
        </nav>
      );
    }

    /** A chapter and, indented beneath it, its sections. */
    const chapterBlock = (c: BookChapterSummary) => (
      <div key={c.id}>
        {chapterRow(c, c.number)}
        {(c.sections ?? []).length > 0 && (
          <div className="space-y-0.5 pb-1">
            {c.sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                title={r.jumpToSection}
                onClick={() =>
                  jumpTo({ chapterId: c.id, kind: "section", sectionId: sec.id })
                }
                className="focus-ring flex w-full items-baseline gap-3 rounded-lg py-1.5 pr-2 pl-10 text-left transition-colors"
                style={{ color: "var(--ink-soft)" }}
              >
                <span
                  className="shrink-0 text-[11px] nums"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {sec.number}
                </span>
                <span className="font-reading min-w-0 flex-1 truncate text-sm leading-snug">
                  {sec.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    return (
      <nav className="space-y-0.5">
        {/* Unparted chapters read before the first part, under no heading. */}
        {contents.chapters.map(chapterBlock)}
        {contents.parts.map((part) => {
          const label = `${r.partLabel(part.number)} · ${part.title}`;
          return (
            <div key={part.id}>
              <p
                className="px-2 pt-4 pb-1 text-[11px] font-semibold uppercase"
                style={{
                  color: "var(--ink-faint)",
                  // Tracking is the point of this kicker in Latin — and what
                  // Myanmar script must never get.
                  letterSpacing: hasMyanmar(label) ? 0 : "0.18em",
                }}
              >
                {label}
              </p>
              {part.chapters.map(chapterBlock)}
            </div>
          );
        })}
      </nav>
    );
    // `chapter` refreshes the cached-minutes chips as chapters load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, contents, chapterId, goTo, jumpTo, cachedChapterMinutes, chapter, r]);

  const localFootnote = (
    <p
      className="px-2 pt-3 pb-1 text-[11px]"
      style={{ color: "var(--ink-faint)" }}
    >
      {r.annotationsLocal}
    </p>
  );

  const editionBookmarks = useMemo(
    () => annos.bookmarks.filter((b) => b.editionId === edition.id),
    [annos.bookmarks, edition.id],
  );
  const editionHighlights = useMemo(
    () => annos.highlights.filter((h) => h.editionId === edition.id),
    [annos.highlights, edition.id],
  );

  const bookmarksList = (
    <div>
      {editionBookmarks.length === 0 ? (
        <p className="px-2 py-3 text-sm" style={{ color: "var(--ink-faint)" }}>
          {r.noBookmarks}
        </p>
      ) : (
        <div className="space-y-0.5">
          {editionBookmarks.map((b) => {
            const chIndex = chapters.findIndex((c) => c.id === b.chapterId);
            return (
              <div key={b.id} className="flex items-start gap-1">
                <button
                  type="button"
                  onClick={() =>
                    jumpTo({
                      chapterId: b.chapterId,
                      kind: "depth",
                      depth: b.pct ?? 0,
                    })
                  }
                  className="focus-ring min-w-0 flex-1 rounded-lg px-2 py-2 text-left"
                  style={{ color: "var(--ink-soft)" }}
                >
                  <span className="block text-xs font-medium nums">
                    {chIndex >= 0 ? r.chapterLabel(chIndex + 1) : r.bookmark}
                    {" · "}
                    {Math.round((b.pct ?? 0) * 100)}%
                  </span>
                  {b.excerpt && (
                    <span
                      className="font-reading mt-0.5 block truncate text-xs"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {b.excerpt}
                    </span>
                  )}
                  <span
                    className="mt-0.5 block text-[11px] nums"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </button>
                <ReaderButton
                  label={r.removeBookmark}
                  onClick={() => annos.removeBookmark(b.id)}
                  className="mt-1"
                >
                  <X className="size-3.5" />
                </ReaderButton>
              </div>
            );
          })}
        </div>
      )}
      {localFootnote}
    </div>
  );

  const notesList = (
    <div>
      {editionHighlights.length === 0 ? (
        <p className="px-2 py-3 text-sm" style={{ color: "var(--ink-faint)" }}>
          {r.noAnnotations}
        </p>
      ) : (
        <div className="space-y-0.5">
          {editionHighlights.map((h) => (
            <div key={h.id} className="flex items-start gap-1">
              <button
                type="button"
                onClick={() =>
                  jumpTo({
                    chapterId: h.chapterId,
                    kind: "anno",
                    id: h.id,
                    blockIndex: h.blockIndex,
                  })
                }
                className="focus-ring flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-2 text-left"
                style={{ color: "var(--ink-soft)" }}
              >
                <span
                  aria-hidden
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--hl-${h.color})` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-reading line-clamp-2 block text-xs leading-relaxed">
                    {h.excerpt}
                  </span>
                  {h.note && (
                    <span
                      className="mt-0.5 line-clamp-2 block text-[11px] italic"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {h.note}
                    </span>
                  )}
                </span>
              </button>
              <ReaderButton
                label={r.removeHighlight}
                onClick={() => annos.removeHighlight(h.id)}
                className="mt-1"
              >
                <X className="size-3.5" />
              </ReaderButton>
            </div>
          ))}
        </div>
      )}
      {localFootnote}
    </div>
  );

  const drawerTabs: ContentsDrawerTab[] = [
    { id: "contents", label: r.contents, content: contentsList },
    { id: "bookmarks", label: r.bookmarks, content: bookmarksList },
    { id: "notes", label: r.notesTab, content: notesList },
    {
      id: "search",
      label: r.searchBook,
      content: (
        <ReaderSearch
          bookId={book.id}
          editionId={edition.id}
          chapters={chapters}
          active={contentsOpen && drawerTab === "search"}
          focusSignal={searchFocusSignal}
          onJump={(match) =>
            jumpTo({ chapterId: match.chapterId, kind: "search", match })
          }
        />
      ),
    },
  ];

  // ---- Render -----------------------------------------------------------

  if (chapters.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={BookOpen}
          title={book.title}
          description={r.emptyBook}
          action={
            <Button
              render={<Link href={`/books/${book.id}`} />}
              nativeButton={false}
            >
              {r.backToBook}
            </Button>
          }
        />
      </div>
    );
  }

  const widthClass = READER_WIDTH_CLASS[settings.width];
  const marginClass = READER_MARGIN_CLASS[settings.margins];
  const fontClass = READER_FONT_CLASS[settings.fontFamily];
  const proseClass = cn(
    "prose-reading",
    settings.textAlign === "left" && "prose-align-left",
  );

  const skeleton = (
    <div className="space-y-4 pt-8">
      <div
        className="mx-auto h-8 w-2/3 animate-pulse rounded"
        style={{
          background: "color-mix(in oklab, var(--ink) 10%, transparent)",
        }}
      />
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded"
          style={{
            width: i % 5 === 4 ? "62%" : "100%",
            background: "color-mix(in oklab, var(--ink) 8%, transparent)",
          }}
        />
      ))}
    </div>
  );

  /** The chapter itself — identical in both reading modes. */
  const chapterBody = chapter ? (
    <>
      {settings.showChapterTitle && (
        /* The chapter opening, set the way a book sets one: the number
           spaced out above, the title below, both centred, with air
           around them instead of a left-ranged page heading. */
        <header className="mb-12 text-center">
          {index >= 0 && (
            <p
              // 0.32em of tracking is the point of this label in Latin — and
              // exactly what Myanmar script must never get, so the spacing is
              // conditional on the rendered string, not the locale.
              className="text-xs uppercase"
              style={{
                color: "var(--ink-faint)",
                letterSpacing: hasMyanmar(r.chapterLabel(index + 1)) ? 0 : "0.32em",
              }}
            >
              {r.chapterLabel(index + 1)}
            </p>
          )}
          <h1
            className="mt-4 text-[1.65rem] leading-snug font-semibold sm:text-[1.9rem]"
            // leading-snug (1.375) collides stacked marks on a two-line
            // Burmese title — the same reason .prose-reading floors [lang=my]
            // leading; this heading sits outside that scope.
            style={{
              color: "var(--ink)",
              lineHeight: hasMyanmar(chapter.title) ? 1.6 : undefined,
            }}
          >
            {chapter.title}
          </h1>
          {chapterMinutes > 0 && (
            <p
              className="mt-3 text-xs nums"
              style={{ color: "var(--ink-faint)" }}
            >
              {r.estMinutes(chapterMinutes)}
            </p>
          )}
          <span
            aria-hidden
            className="mt-6 inline-block text-sm tracking-[0.5em]"
            style={{ color: "var(--ink-faint)" }}
          >
            ❦
          </span>
        </header>
      )}

      {composed.doc ? (
        <ChapterContent content={composed.doc} className={proseClass} />
      ) : (
        /* A written chapter always carries a document — but a chapter
           is one type for both kinds of book now, and a PDF chapter's
           content is its pages, so the field is nullable. Say the
           chapter is empty rather than hand null to the parser. */
        <p
          className="text-center text-sm italic"
          style={{ color: "var(--ink-faint)" }}
        >
          {r.emptyChapter}
        </p>
      )}

      {/* End-of-chapter turn, in the flow of the text rather than in a
          bar — you reach it by finishing the chapter. */}
      <div
        className="mt-16 flex items-center justify-between gap-4 pt-8"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        {previous ? (
          <ReaderButton
            label={previous.title}
            onClick={() => goTo(previous.id)}
            className="min-w-0 flex-1 justify-start text-left"
          >
            <ChevronLeft className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{previous.title}</span>
          </ReaderButton>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <ReaderButton
            label={next.title}
            onClick={() => goTo(next.id)}
            className="min-w-0 flex-1 justify-end text-right"
          >
            <span className="min-w-0 truncate">{next.title}</span>
            <ChevronRight className="size-4 shrink-0" />
          </ReaderButton>
        ) : (
          <p
            className="font-reading flex-1 text-right text-sm italic"
            style={{ color: "var(--ink-faint)" }}
          >
            {r.finished}
          </p>
        )}
      </div>
    </>
  ) : null;

  return (
    <div
      className={cn(
        "reader-surface min-h-[100dvh]",
        paginated && "h-[100dvh] overflow-hidden",
        READER_THEME_CLASS[settings.theme],
      )}
      style={
        {
          "--reading-scale": settings.scale,
          "--reading-leading": LINE_HEIGHT_VALUE[settings.lineHeight],
        } as React.CSSProperties
      }
    >
      {/* Top bar — floats over the page and fades while reading. */}
      <ReaderBar visible={chromeVisible}>
        <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-1 px-3 sm:gap-2 sm:px-5">
          <ContentsToggle
            onClick={() => {
              setDrawerTab("contents");
              setContentsOpen(true);
            }}
          />

          <p
            className="font-reading min-w-0 flex-1 truncate text-center text-sm"
            style={{ color: "var(--ink-soft)" }}
          >
            {book.title}
          </p>

          <ReaderButton label={r.searchInBook} onClick={openSearch}>
            <Search className="size-4" />
          </ReaderButton>
          <ReaderButton
            label={currentBookmark ? r.removeBookmark : r.addBookmark}
            active={Boolean(currentBookmark)}
            onClick={toggleBookmark}
          >
            <BookmarkIcon
              className="size-4"
              fill={currentBookmark ? "currentColor" : "none"}
            />
          </ReaderButton>

          {/* Trigger + panel share a wrapper so the panel's outside-press
              dismissal treats the trigger as inside. */}
          <div className="relative" ref={settingsWrapRef}>
            <ReaderButton
              label={r.settingsTitle}
              active={settingsOpen}
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <Type className="size-4" />
            </ReaderButton>
            <ReaderSettingsPanel
              mode="text"
              settings={settings}
              onChange={changeSettings}
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              dismissRef={settingsWrapRef}
              fullscreen={fullscreen}
            />
          </div>

          {fullscreen.supported && (
            <ReaderButton
              label={fullscreen.active ? r.exitFullscreen : r.fullscreen}
              onClick={fullscreen.toggle}
              className="hidden sm:inline-flex"
            >
              {fullscreen.active ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </ReaderButton>
          )}

          {/* A plain Link, not a ReaderButton wrapping one: an anchor inside
              a button is invalid, and this is navigation, not an action. */}
          <Link
            href={`/books/${book.id}`}
            aria-label={r.close}
            title={r.close}
            className="focus-ring inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-colors"
            style={{ color: "var(--ink-soft)" }}
          >
            <X className="size-4" />
          </Link>
        </div>
      </ReaderBar>

      {/* The page(s) + every selection/annotation overlay, which position
          absolutely against this wrapper (never inside a transformed bar). */}
      <div ref={contentWrapRef} className="relative">
        {!contentReady ? (
          <article
            className={cn(
              "mx-auto pt-24 pb-32",
              fontClass,
              widthClass,
              marginClass,
            )}
          >
            {error ? (
              <EmptyState
                icon={BookOpen}
                title={r.loadError}
                description={t.book.notFoundBody}
              />
            ) : (
              /* The shared Skeleton is bg-white/6 — drawn for the app's
                 near-black background, and invisible on paper. These carry
                 the ink colour instead, so they read on all themes. */
              skeleton
            )}
          </article>
        ) : paginated ? (
          <div className="pt-16">
            <ChapterPaginator
              key={chapterId}
              ref={paginatorRef}
              className={cn(widthClass, marginClass)}
              articleClassName={fontClass}
              initialDepth={paginatorSeedDepth.current}
              layoutSignal={`${settings.scale}:${settings.lineHeight}:${settings.fontFamily}:${settings.width}:${settings.margins}:${settings.textAlign}:${settings.showChapterTitle}`}
              onDepth={reportDepth}
              onPageInfo={(page, pages) =>
                setPageInfo((prev) =>
                  prev.page === page && prev.pages === pages
                    ? prev
                    : { page, pages },
                )
              }
              onNextChapter={next ? () => goTo(next.id) : undefined}
              onPrevChapter={previous ? () => goTo(previous.id) : undefined}
            >
              {chapterBody}
            </ChapterPaginator>
          </div>
        ) : (
          /* Generous top padding rather than a reserved bar height: the bar
             floats, so the text starts where a page's text starts. */
          <article
            ref={articleRef}
            className={cn(
              "mx-auto pt-24 pb-32",
              fontClass,
              widthClass,
              marginClass,
            )}
          >
            {chapterBody}
          </article>
        )}

        <SelectionAnnotator
          containerRef={contentWrapRef}
          userId={user?.id}
          bookId={book.id}
          editionId={edition.id}
          chapterId={chapterId}
          contentReady={contentReady}
          paintSignal={settings.textPageMode}
          onActivityChange={setSelectionActive}
        />
      </div>

      {/* Bottom bar — where you are in the book, the way a printed folio
          sits at the foot of the page. */}
      <ReaderBar visible={chromeVisible} position="bottom">
        <div className="mx-auto flex h-10 w-full max-w-[1600px] items-center justify-between gap-2 px-2 sm:px-4">
          <ReaderButton
            label={r.previousChapter}
            onClick={() => previous && goTo(previous.id)}
            disabled={!previous}
          >
            <ChevronLeft className="size-4" />
          </ReaderButton>

          <p
            className="min-w-0 truncate text-center text-xs nums"
            style={{ color: "var(--ink-faint)" }}
          >
            {index >= 0 && (
              <>
                {r.chapterOf(index + 1, chapters.length)}
                {/* With the in-content title (and its ~N min line) hidden,
                    the chapter estimate moves down here. */}
                {!settings.showChapterTitle &&
                  chapterMinutes > 0 &&
                  ` · ${r.estMinutes(chapterMinutes)}`}
                {` · ${r.percentRead(overallPct)}`}
                {chapterMinutes > 0 && ` · ${r.estMinutesLeft(minsLeft)}`}
                {paginated &&
                  ` · ${r.pageOfShort(pageInfo.page, pageInfo.pages)}`}
              </>
            )}
          </p>

          <ReaderButton
            label={r.nextChapter}
            onClick={() => next && goTo(next.id)}
            disabled={!next}
          >
            <ChevronRight className="size-4" />
          </ReaderButton>
        </div>
      </ReaderBar>

      <ContentsDrawer
        open={contentsOpen}
        onClose={() => setContentsOpen(false)}
        bookId={book.id}
        title={book.title}
        author={book.author}
        tabs={drawerTabs}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
      />

      <ShortcutsHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        themeClass={READER_THEME_CLASS[settings.theme]}
      />

      <ReaderDimOverlay brightness={settings.brightness} />
    </div>
  );
}
