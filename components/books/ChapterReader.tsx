"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { ChapterContent } from "./ChapterContent";
import {
  ChapterTurnCards,
  CloseBookLink,
  ContentsDrawer,
  ContentsToggle,
  PanelOverline,
  ReaderBar,
  ReaderButton,
  ReaderDimOverlay,
  useReaderChrome,
  type ContentsDrawerTab,
} from "./ReaderChrome";
import {
  BackIcon,
  BookGlyph,
  CloudOffReaderIcon,
  CollapseIcon,
  DeviceIcon,
  ExpandIcon,
  ForwardChevronIcon,
  Ornament,
  ReaderSearchIcon,
  RibbonIcon,
  TrashIcon,
  TypeSettingsIcon,
} from "./reader-icons";
import { ReaderSettingsPanel } from "./ReaderSettingsPanel";
import { DEFAULT_READER_SETTINGS, hasMyanmar, LINE_HEIGHT_VALUE, loadReaderSettings, READER_FONT_CLASS, READER_MARGIN_CLASS, READER_THEME_CLASS, READER_WIDTH_CLASS, saveReaderSettings, type ReaderSettingsV2 } from "./reader-settings";
import { useAnnotations } from "./reader-annotations";
import {
  chapterMinutesCached,
  minutesLeft,
} from "./reading-time";
import { ChapterPaginator, type ChapterPaginatorHandle } from "./ChapterPaginator";
import { DOT_COLOR, SelectionAnnotator, wrapBlockRange } from "./SelectionAnnotator";
import { ReaderSearch } from "./ReaderSearch";
import type { ReaderSearchMatch } from "./reader-search";
import { composeChapterDoc, sectionIdAtDepth } from "./chapter-sections";
import { savedChapterDepth } from "./saved-depth";
import { useFullscreen } from "./use-fullscreen";
import { useWakeLock } from "./use-wake-lock";
import { ShortcutsHelp } from "./reader-shortcuts";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { languageLabel } from "@/lib/books/languages";
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
  const p = useSection(playText);
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

  /** Flips once the opening place has been decided (see the effect below). */
  const openingResolved = useRef(false);
  /**
   * True while the saved depth is queued but has not landed on screen yet.
   * No progress is saved until it has (H-31): the chapter opens at its top
   * first, and saving that would overwrite the bookmark — the one the other
   * device saved too — with "the top of the chapter".
   */
  const restorePending = useRef(false);

  /**
   * Resolve the opening place once: an explicit ?chapter= wins (it already
   * seeded chapterId), then the saved bookmark, then the first chapter.
   * Waiting for the progress query is what makes "continue reading"
   * actually resume — including the DEPTH within the chapter, recovered from
   * the whole-book % the save wrote. The depth applies whenever the opening
   * chapter IS the bookmarked one, so the book page's Continue button (which
   * always names that chapter in ?chapter=) resumes mid-chapter too; only a
   * ?section= link, which chose its own landing, goes without it.
   */
  useEffect(() => {
    if (openingResolved.current || chapters.length === 0) return;
    // Until AuthProvider has resolved the profile, `user` is null and a
    // signed-in reader would be opened at chapter 1 instead of their
    // bookmark.
    if (authLoading) return;
    if (isAuthed && loadingProgress) return;
    openingResolved.current = true;
    const savedId = savedProgress?.chapterId;
    const saved = savedId && chapters.some((c) => c.id === savedId);
    const id = chapterId ?? (saved ? savedId! : chapters[0].id);
    if (
      saved &&
      id === savedId &&
      !initialSectionId &&
      !pendingJump.current &&
      typeof savedProgress?.progress === "number"
    ) {
      const depth = savedChapterDepth(
        savedProgress.progress,
        chapters.findIndex((c) => c.id === savedId),
        chapters.length,
      );
      if (depth !== null) {
        pendingJump.current = { chapterId: id, kind: "depth", depth };
        paginatorSeedDepth.current = depth;
        restorePending.current = true;
      }
    }
    if (!chapterId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChapterId(id);
    } else if (restorePending.current) {
      // ?chapter= opened the chapter before the bookmark arrived — its text
      // may already be on screen, so ask the jump below to run again.
      setJumpTick((n) => n + 1);
    }
  }, [
    chapterId,
    chapters,
    authLoading,
    isAuthed,
    loadingProgress,
    savedProgress,
    initialSectionId,
  ]);

  const index = chapters.findIndex((c) => c.id === chapterId);
  const previous = index > 0 ? chapters[index - 1] : null;
  const next =
    index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;

  const {
    data: chapter,
    isLoading: loadingChapter,
    error,
    refetch: refetchChapter,
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
      // Not before the opening place is decided and, if there is a saved
      // depth, not before it has landed — see restorePending.
      if (!openingResolved.current || restorePending.current) return;
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
      // The reader chose a place themselves: that supersedes the saved
      // one, whether it has landed, is still queued, or is still loading.
      openingResolved.current = true;
      restorePending.current = false;
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
        // Same rule as goTo: the reader's own jump wins over the bookmark.
        openingResolved.current = true;
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
    // Whatever lands now — the restored depth, or a jump the reader made
    // before it could — is the reader's place: saving may resume.
    restorePending.current = false;
    const container = contentWrapRef.current;

    const land = (el: Element | null) => {
      if (!el) return;
      if (paginated) paginatorRef.current?.goToElement(el);
      else el.scrollIntoView({ block: "center" });
    };

    if (jump.kind === "depth") {
      // The place is known now; the scroll event after the landing refines
      // it, but a save in between must not record the chapter's top.
      scrollDepth.current = jump.depth;
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
          aria-current={current ? "true" : undefined}
          className={cn(
            "focus-ring flex h-12 w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 px-2 text-left transition-colors",
            current ? "bg-crimson/12" : "bg-transparent hover:bg-tonal-ghost",
          )}
        >
          <span className="w-7 shrink-0 text-[13px] leading-[18px] font-bold text-fg-faint tabular-nums">
            {label}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[15px] leading-[21px] font-semibold",
              current ? "text-link" : "text-fg",
            )}
          >
            {c.title}
          </span>
          {minutes !== null && minutes > 0 && (
            <span className="shrink-0 text-[12px] leading-4 text-fg-faint tabular-nums">
              {r.estMinutes(minutes)}
            </span>
          )}
        </button>
      );
    };

    // Until the numbered tree arrives, the flat list — exactly as before.
    if (!contents) {
      return <nav>{chapters.map((c, i) => chapterRow(c, String(i + 1)))}</nav>;
    }

    /** A chapter and, indented beneath it, its sections. */
    const chapterBlock = (c: BookChapterSummary) => (
      <div key={c.id}>
        {chapterRow(c, c.number)}
        {(c.sections ?? []).length > 0 &&
          c.sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              title={r.jumpToSection}
              onClick={() =>
                jumpTo({ chapterId: c.id, kind: "section", sectionId: sec.id })
              }
              className="focus-ring flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent pr-2 pl-12 text-left transition-colors hover:bg-tonal-ghost"
            >
              <span className="min-w-7 shrink-0 text-[13px] leading-[18px] text-fg-faint tabular-nums">
                {sec.number}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm leading-5 text-fg-body">{sec.title}</span>
            </button>
          ))}
      </div>
    );

    return (
      <nav>
        {/* Unparted chapters read before the first part, under no heading. */}
        {contents.chapters.map(chapterBlock)}
        {contents.parts.map((part) => (
          <div key={part.id}>
            <PanelOverline className="mx-2 mt-2.5 mb-1">
              {`${r.partLabel(part.number)} · ${part.title}`}
            </PanelOverline>
            {part.chapters.map(chapterBlock)}
          </div>
        ))}
      </nav>
    );
    // `chapter` refreshes the cached-minutes chips as chapters load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, contents, chapterId, goTo, jumpTo, cachedChapterMinutes, chapter, r]);

  const localFootnote = (
    <p className="mx-2 mt-1 mb-1.5 flex items-center gap-2 text-[13px] leading-[18px] text-fg-faint">
      <DeviceIcon size={16} className="shrink-0" />
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

  const chapterName = (id: string) => {
    const i = chapters.findIndex((c) => c.id === id);
    return i >= 0 ? `${r.chapterLabel(i + 1)} · ${chapters[i].title}` : null;
  };

  const trashButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="focus-ring flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-fg-muted transition-colors hover:bg-tonal-ghost hover:text-fg"
    >
      <TrashIcon size={18} />
    </button>
  );

  const bookmarksList = (
    <div>
      {localFootnote}
      {editionBookmarks.length === 0 ? (
        <p className="mx-2 py-3 text-sm text-fg-faint">{r.noBookmarks}</p>
      ) : (
        editionBookmarks.map((b) => {
          const chIndex = chapters.findIndex((c) => c.id === b.chapterId);
          return (
            <div key={b.id} className="flex items-center gap-3 px-2 py-3 shadow-[inset_0_-1px_0_var(--mq-hairline)]">
              <RibbonIcon filled size={18} className="shrink-0 text-crimson" />
              <button
                type="button"
                onClick={() =>
                  jumpTo({
                    chapterId: b.chapterId,
                    kind: "depth",
                    depth: b.pct ?? 0,
                  })
                }
                className="focus-ring flex min-w-0 flex-1 cursor-pointer flex-col rounded-[8px] border-0 bg-transparent p-0 text-left"
              >
                <span className="text-[12px] leading-4 font-bold text-fg-faint tabular-nums">
                  {chIndex >= 0 ? r.chapterLabel(chIndex + 1) : r.bookmark}
                  {" · "}
                  {Math.round((b.pct ?? 0) * 100)}%{" · "}
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
                {b.excerpt && (
                  <span className="mt-0.5 line-clamp-2 text-sm leading-5 text-fg-body">{b.excerpt}</span>
                )}
              </button>
              {trashButton(r.removeBookmark, () => annos.removeBookmark(b.id))}
            </div>
          );
        })
      )}
    </div>
  );

  const notesList = (
    <div>
      {localFootnote}
      {editionHighlights.length === 0 ? (
        <p className="mx-2 py-3 text-sm text-fg-faint">{r.noAnnotations}</p>
      ) : (
        editionHighlights.map((h) => (
          <div key={h.id} className="flex items-start gap-3 px-2 py-3 shadow-[inset_0_-1px_0_var(--mq-hairline)]">
            <span
              aria-hidden
              className="w-1 shrink-0 self-stretch rounded-[2px]"
              style={{ background: DOT_COLOR[h.color] }}
            />
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
              className="focus-ring flex min-w-0 flex-1 cursor-pointer flex-col rounded-[8px] border-0 bg-transparent p-0 text-left"
            >
              {chapterName(h.chapterId) && (
                <span className="truncate text-[12px] leading-4 font-bold text-fg-faint">
                  {chapterName(h.chapterId)}
                </span>
              )}
              <span className="mt-0.5 line-clamp-2 text-sm leading-5 text-fg">{h.excerpt}</span>
              {h.note && (
                <span className="mt-1.5 line-clamp-3 rounded-[8px] bg-raised px-2.5 py-2 text-[13px] leading-[18px] text-fg-body">
                  {h.note}
                </span>
              )}
            </button>
            {trashButton(r.removeHighlight, () => annos.removeHighlight(h.id))}
          </div>
        ))
      )}
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-ground px-gutter py-24">
        <EmptyState
          icon={BookGlyph}
          title={book.title}
          description={r.emptyBook}
          headingLevel="h2"
          action={
            <Link href={`/books/${book.id}`} className={buttonVariants({ variant: "play", size: "cta" })}>
              {r.backToBook}
            </Link>
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

  /* The shared skeleton is drawn for the app's near-black ground and would
     vanish on paper — these lines carry the ink colour instead, so they read
     on every theme. */
  const skeleton = (
    <div aria-busy="true" className="flex flex-col gap-[18px] pt-2">
      <p role="status" className="sr-only">
        {p.loadingChapter}
      </p>
      {["100%", "96%", "100%", "92%", "70%", "100%", "98%", "100%", "88%", "60%"].map((width, i) => (
        <span
          key={i}
          aria-hidden
          className="block h-[15px] animate-mq-pulse rounded-[5px]"
          style={{
            width,
            background: "color-mix(in oklab, var(--ink) 10%, transparent)",
          }}
        />
      ))}
    </div>
  );

  const loadError = (
    <div role="status" className="flex flex-col items-center px-4 pt-10 text-center font-sans">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-danger/14 text-danger">
        <CloudOffReaderIcon size={28} />
      </span>
      <p className="mt-[18px] text-lg leading-[26px] font-extrabold" style={{ color: "var(--ink)" }}>
        {r.loadError}
      </p>
      <p className="mt-1.5 text-[15px] leading-[22px]" style={{ color: "var(--ink-faint)" }}>
        {t.book.notFoundBody}
      </p>
      <button
        type="button"
        onClick={() => void refetchChapter()}
        className="focus-ring mt-5 h-12 cursor-pointer rounded-[12px] border-0 px-7 text-base font-extrabold transition-[opacity,transform] hover:opacity-[0.88] active:scale-[0.97]"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        {t.common.retry}
      </button>
    </div>
  );

  /** The chapter itself — identical in both reading modes. */
  const chapterBody = chapter ? (
    <>
      {settings.showChapterTitle && (
        /* The chapter opening, set the way a book sets one: the number
           spaced out above, the title below, both centred, with air
           around them instead of a left-ranged page heading. */
        <header className="mb-9 text-center font-sans">
          {index >= 0 && (
            <p
              // 0.16em of tracking is the point of this label in Latin — and
              // exactly what Myanmar script must never get, so the spacing is
              // conditional on the rendered string, not the locale.
              className="text-[12px] leading-4 font-extrabold uppercase"
              style={{
                color: "var(--ink-faint)",
                letterSpacing: hasMyanmar(r.chapterLabel(index + 1)) ? 0 : "0.16em",
              }}
            >
              {r.chapterLabel(index + 1)}
            </p>
          )}
          <h1
            className="mt-2.5 text-[clamp(30px,2.8vw,40px)] leading-[1.15] font-black"
            // A two-line Burmese title collides its stacked marks at Latin
            // leading — the same reason .prose-reading floors [lang=my]
            // leading; this heading sits outside that scope.
            style={{
              color: "var(--ink)",
              letterSpacing: hasMyanmar(chapter.title) ? 0 : "-0.03em",
              lineHeight: hasMyanmar(chapter.title) ? 1.6 : undefined,
            }}
          >
            {chapter.title}
          </h1>
          {chapterMinutes > 0 && (
            <p className="mt-2 text-sm leading-5 tabular-nums" style={{ color: "var(--ink-faint)" }}>
              {r.estMinutes(chapterMinutes)}
            </p>
          )}
          <span className="mt-4 flex justify-center" style={{ color: "var(--ink-faint)" }}>
            <Ornament />
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
      <span className="mt-9 flex justify-center" style={{ color: "var(--ink-faint)" }}>
        <Ornament />
      </span>
      <ChapterTurnCards
        previous={previous ? { title: previous.title, onClick: () => goTo(previous.id) } : null}
        next={next ? { title: next.title, onClick: () => goTo(next.id) } : null}
        previousLabel={r.previousChapter}
        nextLabel={r.nextChapter}
        finishedLabel={r.finished}
      />
    </>
  ) : null;

  const readingIn = languageLabel(edition.language);

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
        <div className="mx-auto flex h-16 w-full items-center gap-1 px-[clamp(8px,2vw,24px)]">
          <CloseBookLink bookId={book.id} />
          <ContentsToggle
            expanded={contentsOpen && drawerTab !== "search"}
            onClick={() => {
              setDrawerTab("contents");
              setContentsOpen(true);
            }}
          />

          <div className="min-w-0 flex-1 text-center max-desk:hidden">
            <p className="m-0 truncate text-[15px] leading-5 font-extrabold" style={{ color: "var(--ink)" }}>
              {book.title}
            </p>
            {chapter && index >= 0 && (
              <p className="m-0 truncate text-[12px] leading-[17px] font-semibold" style={{ color: "var(--ink-faint)" }}>
                {`${r.chapterLabel(index + 1)} · ${chapter.title}`}
              </p>
            )}
          </div>
          <span aria-hidden className="flex-1 desk:hidden" />

          <ReaderButton label={r.searchInBook} onClick={openSearch}>
            <ReaderSearchIcon size={21} />
          </ReaderButton>
          <ReaderButton
            label={currentBookmark ? r.removeBookmark : r.addBookmark}
            pressed={Boolean(currentBookmark)}
            onClick={toggleBookmark}
            style={currentBookmark ? { color: "var(--mq-crimson)" } : undefined}
          >
            <RibbonIcon size={21} filled={Boolean(currentBookmark)} />
          </ReaderButton>

          {/* Trigger + panel share a wrapper so the panel's outside-press
              dismissal treats the trigger as inside. */}
          <div className="relative" ref={settingsWrapRef}>
            <ReaderButton
              label={r.settingsTitle}
              active={settingsOpen}
              expanded={settingsOpen}
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <TypeSettingsIcon size={22} />
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
              className="max-desk:hidden"
            >
              {fullscreen.active ? <CollapseIcon size={19} /> : <ExpandIcon size={19} />}
            </ReaderButton>
          )}
        </div>
      </ReaderBar>

      {/* The page(s) + every selection/annotation overlay, which position
          absolutely against this wrapper (never inside a transformed bar). */}
      <div ref={contentWrapRef} className="relative">
        {!contentReady ? (
          <article
            className={cn(
              "mx-auto pt-28 pb-36",
              fontClass,
              widthClass,
              marginClass,
            )}
          >
            {error ? loadError : skeleton}
          </article>
        ) : paginated ? (
          <div className="pt-20">
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
              "mx-auto pt-28 pb-36",
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
          sits at the foot of the page; the crimson line is how far. */}
      <ReaderBar visible={chromeVisible} position="bottom" progress={overallPct}>
        <div className="mx-auto flex h-[60px] w-full items-center justify-between gap-1 px-[clamp(8px,2vw,24px)]">
          <ReaderButton
            label={previous ? p.previousChapterNamed(previous.title) : r.previousChapter}
            onClick={() => previous && goTo(previous.id)}
            disabled={!previous}
            className="max-w-[30%] justify-start pr-3.5 pl-2"
          >
            <BackIcon size={20} className="shrink-0" />
            {previous && <span className="truncate max-desk:hidden">{previous.title}</span>}
          </ReaderButton>

          <p
            className="m-0 min-w-0 flex-1 truncate text-center text-[13px] leading-[18px] font-semibold tabular-nums"
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
            label={next ? p.nextChapterNamed(next.title) : r.nextChapter}
            onClick={() => next && goTo(next.id)}
            disabled={!next}
            className="max-w-[30%] justify-end pr-2 pl-3.5"
          >
            {next && <span className="truncate max-desk:hidden">{next.title}</span>}
            <ForwardChevronIcon size={20} className="shrink-0" />
          </ReaderButton>
        </div>
      </ReaderBar>

      <ContentsDrawer
        open={contentsOpen}
        onClose={() => setContentsOpen(false)}
        bookId={book.id}
        title={book.title}
        author={book.author}
        readingIn={readingIn}
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
