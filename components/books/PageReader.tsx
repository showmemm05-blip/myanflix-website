"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  Bookmark as BookmarkIcon,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GalleryThumbnails,
  Maximize,
  Minimize,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty/EmptyState";
import {
  ContentsDrawer,
  ContentsToggle,
  ReaderBar,
  ReaderButton,
  ReaderDimOverlay,
  useReaderChrome,
} from "./ReaderChrome";
import { ReaderSettingsPanel } from "./ReaderSettingsPanel";
import { ShortcutsHelp } from "./reader-shortcuts";
import {
  useAnnotations,
  type Bookmark,
} from "./reader-annotations";
import { useFullscreen } from "./use-fullscreen";
import { useWakeLock } from "./use-wake-lock";
import {
  DEFAULT_READER_SETTINGS,
  PAGE_BACKGROUND_VALUE,
  READER_THEME_CLASS,
  hasMyanmar,
  loadBookView,
  loadReaderSettings,
  saveBookView,
  saveReaderSettings,
  type BookViewMemory,
  type FitId,
  type PageModeId,
  type ReaderSettingsV2,
  type RotationId,
} from "./reader-settings";
import {
  PageStage,
  RotatedPageImage,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clampZoom,
  rotatedAspect,
} from "./PageStage";
import { PageThumbnails } from "./PageThumbnails";
import { sectionIdAtPage } from "./chapter-sections";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import {
  readingProgressKey,
  useBookChapters,
  useBookContents,
  useBookPages,
  useReadingProgress,
} from "@/hooks/use-books";
import { bookService } from "@/services/api/bookService";
import { cn } from "@/lib/utils";
import type {
  BookChapterSummary,
  BookDetail,
  BookEdition,
  BookPage,
} from "@/types/book";

const PROGRESS_SAVE_INTERVAL_MS = 8000;

/**
 * How many pages either side of the current one are mounted as real
 * <Image> elements. Everything outside this window renders as a sized
 * placeholder box instead — that is the whole windowing strategy, and it is
 * why a 600-page book costs the same as a 6-page one.
 *
 * 2 is enough that a fast scroll or a held arrow key never outruns the
 * loader, while keeping at most 5 decoded images in memory.
 */
const RENDER_WINDOW = 2;

/** Below this, "Spread" quietly behaves as single — the settings panel keeps
    saying Spread, but a portrait phone can't honestly show two sheets. */
const DOUBLE_MIN_WIDTH_QUERY = "(min-width: 900px)";

/**
 * THE PAGE READER — PDF books.
 *
 * A reader of page IMAGES, deliberately NOT a chapter reader with different
 * content: the unit of NAVIGATION here is a fixed-size image and the hard
 * problem is not typography but never loading six hundred images at once.
 * What it shares with the chapter reader is the unit of CONTENT: a PDF book
 * is serialised, one uploaded and converted chapter at a time, so pages are
 * numbered within their chapter and the reader turns chapters the way a
 * comic reader does — from the foot of the last page, or the contents.
 *
 * Three view modes now: `scroll` is the original windowed vertical list
 * (every page reserves its exact aspect box up front, so the scrollbar is
 * correct from first paint); `single`/`double` hand the current sheet or
 * spread to PageStage. Zoom, rotation, fit and mode are remembered PER BOOK
 * (view memory) over the global reading settings.
 */
export function PageReader({
  book,
  edition,
  initialChapterId,
  initialPage,
}: {
  book: BookDetail;
  /** The LANGUAGE being read — chapters belong to it, not to the book. */
  edition: BookEdition;
  /** The chapter the route resolved, or null to fall back to the bookmark. */
  initialChapterId: string | null;
  /** A page linked to directly from the book page, ahead of any bookmark. */
  initialPage: number | null;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const { user, isLoading: authLoading } = useAuth();
  const isAuthed = Boolean(user);
  const uid = user?.id;
  const queryClient = useQueryClient();

  const { data: chapters = [], isLoading: loadingChapters } = useBookChapters(
    book.id,
    edition.id,
  );
  // The numbered tree the contents tab renders from (parts, sections as
  // page anchors); the flat list stays the source of prev/next. Until it
  // arrives the tab shows the flat list, exactly as it always has.
  const { data: contents } = useBookContents(book.id, edition.id);
  const { data: savedProgress, isLoading: loadingProgress } =
    useReadingProgress(book.id, edition.id, isAuthed);

  const [chapterId, setChapterId] = useState<string | null>(initialChapterId);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpValue, setJumpValue] = useState("");
  const [contentsOpen, setContentsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // ── Settings & per-book view memory ────────────────────────────────────
  // Global v2 settings, with this book's remembered {pageMode, fit} layered
  // over them and zoom/rotation living per book only. Loaded in an effect
  // (not an initializer) so the server render and first client paint agree,
  // and re-loaded when auth resolves — the anon→user carry-over lives in
  // loadReaderSettings itself.

  const [settings, setSettings] = useState<ReaderSettingsV2>(
    DEFAULT_READER_SETTINGS,
  );
  const [viewOverride, setViewOverride] = useState<
    Pick<BookViewMemory, "pageMode" | "fit">
  >({});
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<RotationId>(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-mount localStorage read; see note above */
    setSettings(loadReaderSettings(uid));
    const view = loadBookView(uid, book.id);
    setViewOverride({
      ...(view.pageMode !== undefined ? { pageMode: view.pageMode } : {}),
      ...(view.fit !== undefined ? { fit: view.fit } : {}),
    });
    if (view.zoom !== undefined) setZoom(view.zoom);
    if (view.rotation !== undefined) setRotation(view.rotation);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [uid, book.id]);

  const pageModeSetting: PageModeId = viewOverride.pageMode ?? settings.pageMode;
  const fitSetting: FitId = viewOverride.fit ?? settings.fit;

  const wideEnoughForSpread = useMediaQuery(DOUBLE_MIN_WIDTH_QUERY);
  const effectiveMode: PageModeId =
    pageModeSetting === "double" && !wideEnoughForSpread
      ? "single"
      : pageModeSetting;
  // The vertical ribbon has no height to fit against — 'height' degrades to
  // 'screen' there (the settings panel doesn't offer it in scroll mode).
  const effectiveFit: FitId =
    effectiveMode === "scroll" && fitSetting === "height" ? "screen" : fitSetting;

  /**
   * Every panel edit lands in the global settings; pageMode/fit ALSO land in
   * this book's view memory, because layout is a property of a given scan.
   * Zoom and rotation never touch the global blob at all.
   */
  const applySettings = useCallback(
    (patch: Partial<ReaderSettingsV2>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveReaderSettings(uid, next);
        return next;
      });
      const viewPatch: BookViewMemory = {};
      if (patch.pageMode !== undefined) viewPatch.pageMode = patch.pageMode;
      if (patch.fit !== undefined) viewPatch.fit = patch.fit;
      if (viewPatch.pageMode !== undefined || viewPatch.fit !== undefined) {
        setViewOverride((v) => ({ ...v, ...viewPatch }));
        saveBookView(uid, book.id, viewPatch);
      }
    },
    [uid, book.id],
  );

  const changeZoom = useCallback(
    (next: number) => {
      const clamped = clampZoom(next);
      setZoom(clamped);
      saveBookView(uid, book.id, { zoom: clamped });
    },
    [uid, book.id],
  );

  const rotate = useCallback(() => {
    setRotation((prev) => {
      const next = ((prev + 90) % 360) as RotationId;
      saveBookView(uid, book.id, { rotation: next });
      return next;
    });
  }, [uid, book.id]);

  const containerRef = useRef<HTMLDivElement>(null);
  // A latch, never rendered — a ref rather than state so resuming does not
  // cost an extra render pass.
  const restored = useRef(false);
  const pageRefs = useRef(new Map<number, HTMLElement>());

  const { data: pages, error } = useBookPages(book.id, edition.id, chapterId);

  const total = pages?.length ?? 0;

  const index = chapters.findIndex((c) => c.id === chapterId);
  const chapter = index >= 0 ? chapters[index] : null;
  const previousChapter = index > 0 ? chapters[index - 1] : null;
  const nextChapter =
    index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;

  // Bars stay up while any panel is open — see useReaderChrome.
  const { visible: chromeVisible } = useReaderChrome(
    contentsOpen || settingsOpen || thumbsOpen || shortcutsOpen,
    { autoHide: settings.autoHideChrome },
  );

  const fs = useFullscreen();
  useWakeLock(settings.keepAwake);

  const scrollToPage = useCallback((pageNumber: number) => {
    const el = pageRefs.current.get(pageNumber);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);

  /**
   * Resolve the opening chapter once, exactly as the chapter reader does:
   * the route's ?chapter= wins, then the saved bookmark, then the first
   * chapter. The auth guard is the point — AuthProvider starts with
   * user=null while it bootstraps the profile, and latching here would open
   * a signed-in reader at chapter one instead of their bookmark.
   */
  useEffect(() => {
    if (chapterId || chapters.length === 0) return;
    if (authLoading) return;
    if (isAuthed && loadingProgress) return;
    const savedId = savedProgress?.chapterId;
    const saved = savedId && chapters.some((c) => c.id === savedId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChapterId(saved ? savedId! : chapters[0].id);
  }, [
    chapterId,
    chapters,
    authLoading,
    isAuthed,
    loadingProgress,
    savedProgress,
  ]);

  /**
   * Resume, once, after the pages exist to scroll to. `restored` guards it
   * so a later progress refetch — or the next chapter loading — can never
   * yank the reader back. In single/double the state alone puts the sheet
   * on stage; the scrollToPage below is a no-op there (no refs to scroll).
   */
  useEffect(() => {
    if (restored.current || total === 0) return;
    // Same bootstrap guard as the chapter resolution above: deciding
    // "anonymous, nothing to restore" for a signed-in reader whose pages
    // query simply resolved first would lose their place.
    if (authLoading) return;
    if (isAuthed && loadingProgress) return;
    // Page numbers restart in every chapter, so the bookmarked page only
    // means anything in the chapter it was saved in.
    const bookmarked =
      savedProgress?.chapterId === chapterId ? savedProgress?.pageNumber : null;
    // A page linked to explicitly is a deliberate choice and outranks the
    // bookmark; without it, resume where the reader left off.
    const saved = initialPage ?? bookmarked;
    restored.current = true;
    if (saved && saved > 1 && saved <= total) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(saved);
      // One frame, so the placeholder boxes have laid out and the target
      // page is at its final offset before we jump to it.
      requestAnimationFrame(() => scrollToPage(saved));
    }
  }, [
    total,
    chapterId,
    authLoading,
    isAuthed,
    loadingProgress,
    savedProgress,
    initialPage,
    scrollToPage,
  ]);

  /**
   * Which page is being read = the one covering the vertical middle of the
   * viewport. An IntersectionObserver "most visible" heuristic gets this
   * wrong on a tall page that fills the screen entirely; a midpoint test
   * never does. Scroll mode only — on the stage, currentPage IS the truth.
   */
  useEffect(() => {
    if (total === 0 || effectiveMode !== "scroll") return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const middle = window.innerHeight / 2;
        let best = currentPage;
        for (const [pageNumber, el] of pageRefs.current) {
          const box = el.getBoundingClientRect();
          if (box.top <= middle && box.bottom >= middle) {
            best = pageNumber;
            break;
          }
        }
        if (best !== currentPage) setCurrentPage(best);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [total, currentPage, effectiveMode]);

  // ---- Progress ---------------------------------------------------------

  const lastSavedAt = useRef(0);
  const pageRef = useRef(currentPage);
  useEffect(() => {
    pageRef.current = currentPage;
  });

  /**
   * Overall progress = chapters finished + how far into this one, the same
   * shape the chapter reader saves — so the bar on the book page means one
   * thing whichever kind of book it is measuring.
   */
  const computeProgress = useCallback(() => {
    if (chapters.length === 0 || index < 0 || total === 0) return 0;
    const perChapter = 100 / chapters.length;
    return Math.min(100, perChapter * (index + pageRef.current / total));
  }, [chapters.length, index, total]);

  const saveProgress = useCallback(
    (force = false) => {
      if (!isAuthed || !chapterId || total === 0) return;
      const now = Date.now();
      if (!force && now - lastSavedAt.current < PROGRESS_SAVE_INTERVAL_MS)
        return;
      lastSavedAt.current = now;
      // The section this page falls in, when the chapter has any — the key
      // is omitted otherwise, so a section-less book sends the body it
      // always did.
      const sectionId = sectionIdAtPage(chapter?.sections ?? [], pageRef.current);
      void bookService
        .updateReadingProgress(book.id, edition.id, {
          // Both halves: the chapter is what re-opens the book, the page is
          // where in it. A PDF book bookmarks like a written one now.
          chapterId,
          pageNumber: pageRef.current,
          progress: computeProgress(),
          ...(sectionId ? { sectionId } : {}),
        })
        // useReadingProgress is staleTime: Infinity (deliberately — a
        // refetch mid-read could yank the reader elsewhere), so the cache
        // has to be told, or re-entering the book this session restores a
        // stale page. setQueryData, not invalidate: no redundant GET to
        // race the next PATCH.
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
      chapter,
      total,
      book.id,
      edition.id,
      computeProgress,
      queryClient,
    ],
  );

  useEffect(() => {
    if (!isAuthed) return;
    const timer = setInterval(() => saveProgress(), PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthed, saveProgress]);

  const forceSave = useRef(saveProgress);
  useEffect(() => {
    forceSave.current = saveProgress;
  });
  // Keyed on the chapter, not on mount: leaving a chapter is as much a
  // departure as closing the tab, and React runs this cleanup before the
  // ref above is repointed, so it still saves the chapter being left.
  useEffect(() => {
    return () => forceSave.current(true);
  }, [chapterId]);

  // ---- Navigation -------------------------------------------------------

  const goToPage = useCallback(
    (pageNumber: number) => {
      const clamped = Math.min(total, Math.max(1, pageNumber));
      setCurrentPage(clamped);
      scrollToPage(clamped);
    },
    [total, scrollToPage],
  );

  const goToChapter = useCallback(
    (id: string) => {
      // Save the chapter being left, at the page actually reached, HERE —
      // not only in the [chapterId] cleanup. That cleanup does see the same
      // values (it runs before this commit repoints pageRef and forceSave),
      // but the bookmark for a turned chapter should not hang on that
      // ordering rule. The chapter reader saves in its goTo for the same
      // reason.
      saveProgress(true);
      setChapterId(id);
      setCurrentPage(1);
      setJumpValue("");
      setContentsOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [saveProgress],
  );

  /**
   * Spread-aware turns. Pairing is [1], [2,3], [4,5]…, so "next" from
   * anywhere in a spread is the next spread's first page. At the chapter's
   * edges the stage modes turn the chapter itself — a serialised book is
   * read straight through, and the stage has no chapter-turn footer.
   */
  const nextPage = useCallback(() => {
    if (total === 0) return;
    if (effectiveMode === "scroll") {
      goToPage(currentPage + 1);
      return;
    }
    const start =
      currentPage <= 1 ? 1 : currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const target =
      effectiveMode === "double" ? (currentPage <= 1 ? 2 : start + 2) : currentPage + 1;
    if (target > total) {
      if (nextChapter) goToChapter(nextChapter.id);
      return;
    }
    goToPage(target);
  }, [total, effectiveMode, currentPage, nextChapter, goToChapter, goToPage]);

  const prevPage = useCallback(() => {
    if (total === 0) return;
    if (effectiveMode === "scroll") {
      goToPage(currentPage - 1);
      return;
    }
    if (currentPage <= 1) {
      if (previousChapter) goToChapter(previousChapter.id);
      return;
    }
    const start = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const target =
      effectiveMode === "double" ? (start <= 2 ? 1 : start - 2) : currentPage - 1;
    goToPage(target);
  }, [total, effectiveMode, currentPage, previousChapter, goToChapter, goToPage]);

  // Coming back to scroll mode, land the ribbon on the page the stage was
  // showing — one frame later, after the aspect boxes exist to scroll to.
  const prevModeRef = useRef(effectiveMode);
  useEffect(() => {
    if (prevModeRef.current === effectiveMode) return;
    prevModeRef.current = effectiveMode;
    if (effectiveMode === "scroll") {
      requestAnimationFrame(() => scrollToPage(pageRef.current));
    }
  }, [effectiveMode, scrollToPage]);

  // ---- Bookmarks --------------------------------------------------------

  const { bookmarks, addBookmark, removeBookmark } = useAnnotations(
    uid,
    book.id,
  );
  const editionBookmarks = useMemo(
    () => bookmarks.filter((b) => b.editionId === edition.id),
    [bookmarks, edition.id],
  );
  const currentBookmark = editionBookmarks.find(
    (b) => b.chapterId === chapterId && b.pageNumber === currentPage,
  );

  const toggleBookmark = useCallback(() => {
    if (!chapterId || total === 0) return;
    if (currentBookmark) {
      removeBookmark(currentBookmark.id);
      return;
    }
    const result = addBookmark({
      editionId: edition.id,
      chapterId,
      pageNumber: currentPage,
    });
    if (!result.ok && result.reason === "limit")
      toast.error(r.annotationLimit);
  }, [
    chapterId,
    total,
    currentBookmark,
    removeBookmark,
    addBookmark,
    edition.id,
    currentPage,
    r.annotationLimit,
  ]);

  /** A cross-chapter jump has to wait for the target chapter's pages. */
  const pendingJump = useRef<{ chapterId: string; page: number } | null>(null);
  useEffect(() => {
    const jump = pendingJump.current;
    if (!jump || jump.chapterId !== chapterId || total === 0) return;
    pendingJump.current = null;
    const page = Math.min(total, Math.max(1, jump.page));
    setCurrentPage(page);
    requestAnimationFrame(() => scrollToPage(page));
  }, [chapterId, total, scrollToPage]);

  const jumpToBookmark = useCallback(
    (bookmark: Bookmark) => {
      const page = bookmark.pageNumber ?? 1;
      if (bookmark.chapterId === chapterId) {
        goToPage(page);
        setContentsOpen(false);
        return;
      }
      pendingJump.current = { chapterId: bookmark.chapterId, page };
      goToChapter(bookmark.chapterId);
    },
    [chapterId, goToPage, goToChapter],
  );

  // ---- Wheel zoom (scroll mode) -----------------------------------------
  // The stage handles its own ctrl/cmd+wheel with a precise cursor anchor;
  // here the ribbon keeps the viewport's midline roughly in place instead —
  // every page above scales by the same factor, so scaling scrollY holds.

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  });

  useEffect(() => {
    if (effectiveMode !== "scroll") return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const next = clampZoom(zoomRef.current * Math.exp(-e.deltaY * 0.002));
      if (next === zoomRef.current) return;
      const ratio = next / zoomRef.current;
      changeZoom(next);
      requestAnimationFrame(() => {
        const mid = window.innerHeight / 2;
        window.scrollTo({
          top: (window.scrollY + mid) * ratio - mid,
          behavior: "instant",
        });
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [effectiveMode, changeZoom]);

  // ---- Keyboard ---------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      // Never shadow the browser's own chords (cmd+R, ctrl+L, …) — the only
      // modifier this keymap uses is shift.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const stage = effectiveMode !== "scroll";
      const rtl = stage && settings.pageDirection === "rtl";

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            if (previousChapter) goToChapter(previousChapter.id);
          } else if (rtl) nextPage();
          else prevPage();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            if (nextChapter) goToChapter(nextChapter.id);
          } else if (rtl) prevPage();
          else nextPage();
          break;
        case "PageUp":
          e.preventDefault();
          prevPage();
          break;
        case "PageDown":
          e.preventDefault();
          nextPage();
          break;
        case " ":
          // Scroll mode keeps the browser's native screenful-scroll.
          if (stage) {
            e.preventDefault();
            if (e.shiftKey) prevPage();
            else nextPage();
          }
          break;
        case "Home":
          e.preventDefault();
          goToPage(1);
          break;
        case "End":
          e.preventDefault();
          goToPage(total);
          break;
        case "t":
        case "T":
          setContentsOpen((open) => !open);
          break;
        case "b":
        case "B":
          toggleBookmark();
          break;
        case "s":
        case "S":
          setSettingsOpen((open) => !open);
          break;
        case "f":
        case "F":
          fs.toggle();
          break;
        case "g":
        case "G":
          setThumbsOpen((open) => !open);
          break;
        case "d":
        case "D":
          if (effectiveMode !== "scroll")
            applySettings({
              pageMode: effectiveMode === "double" ? "single" : "double",
            });
          break;
        case "+":
        case "=":
          changeZoom(zoomRef.current + ZOOM_STEP);
          break;
        case "-":
        case "_":
          changeZoom(zoomRef.current - ZOOM_STEP);
          break;
        case "0":
          changeZoom(1);
          break;
        case "r":
        case "R":
          rotate();
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        case "Escape":
          // Drawer, settings and help each close themselves on Escape; only
          // once nothing is stacked does Escape mean "leave fullscreen".
          if (contentsOpen || settingsOpen || shortcutsOpen) break;
          if (thumbsOpen) setThumbsOpen(false);
          else if (fs.active) fs.toggle();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    effectiveMode,
    settings.pageDirection,
    previousChapter,
    nextChapter,
    goToChapter,
    prevPage,
    nextPage,
    goToPage,
    total,
    toggleBookmark,
    fs,
    applySettings,
    changeZoom,
    rotate,
    contentsOpen,
    settingsOpen,
    shortcutsOpen,
    thumbsOpen,
  ]);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(jumpValue);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= total) {
      goToPage(parsed);
      setJumpValue("");
    }
  };

  const visibleRange = useMemo(
    () => ({
      from: currentPage - RENDER_WINDOW,
      to: currentPage + RENDER_WINDOW,
    }),
    [currentPage],
  );

  // ---- Render -----------------------------------------------------------

  /**
   * The contents are the CHAPTERS, not this chapter's page numbers: a
   * serialised release is recognised by its cover long before its number,
   * which is why each row leads with the chapter's own image.
   */
  const contentsList = useMemo(() => {
    /** One chapter row — the same markup whichever list it sits in. */
    const chapterRow = (c: BookChapterSummary, label: string) => {
      const current = c.id === chapterId;
      return (
        <button
          key={c.id}
          type="button"
          onClick={() => goToChapter(c.id)}
          className="focus-ring flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
          style={{
            background: current
              ? "color-mix(in oklab, var(--ink) 8%, transparent)"
              : "transparent",
            color: current ? "var(--ink)" : "var(--ink-soft)",
          }}
        >
          {c.imageUrl ? (
            <span
              className="relative block size-12 shrink-0 overflow-hidden rounded"
              style={{
                background: "#ffffff",
                outline: "1px solid var(--rule)",
                outlineOffset: "-1px",
              }}
            >
              <Image
                src={c.imageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </span>
          ) : (
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded text-sm nums"
              style={{
                background:
                  "color-mix(in oklab, var(--ink) 7%, transparent)",
                color: "var(--ink-faint)",
              }}
            >
              {label}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="font-reading block truncate text-[0.95rem] leading-snug">
              {c.title}
            </span>
            {c.pageCount > 0 && (
              <span
                className="mt-0.5 block text-xs nums"
                style={{ color: "var(--ink-faint)" }}
              >
                {t.book.chapterPages(c.pageCount)}
              </span>
            )}
          </span>
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

    /** A chapter and, indented beneath it, its sections as page anchors. */
    const chapterBlock = (c: BookChapterSummary) => (
      <div key={c.id}>
        {chapterRow(c, c.number)}
        {(c.sections ?? []).length > 0 && (
          <div className="space-y-0.5 pb-1">
            {c.sections.map((sec) => {
              const page = sec.startPage ?? 1;
              return (
                <button
                  key={sec.id}
                  type="button"
                  title={r.jumpToSection}
                  onClick={() => {
                    if (c.id === chapterId) {
                      goToPage(page);
                      setContentsOpen(false);
                      return;
                    }
                    // Another chapter: wait for its pages, then land.
                    pendingJump.current = { chapterId: c.id, page };
                    goToChapter(c.id);
                  }}
                  className="focus-ring flex w-full items-baseline gap-3 rounded-lg py-1.5 pr-2 pl-[4.25rem] text-left transition-colors"
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
                  {sec.startPage !== null && (
                    <span
                      className="shrink-0 text-[11px] nums"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {t.book.pageRange(sec.startPage, sec.endPage ?? sec.startPage)}
                    </span>
                  )}
                </button>
              );
            })}
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
  }, [chapters, contents, chapterId, goToChapter, goToPage, t, r]);

  /** Bookmarks tab — page bookmarks for THIS edition, newest last. */
  const bookmarksTab = useMemo(
    () => (
      <div className="flex min-h-full flex-col">
        {editionBookmarks.length === 0 ? (
          <p className="px-2 py-3 text-sm" style={{ color: "var(--ink-faint)" }}>
            {r.noBookmarks}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {editionBookmarks.map((b) => {
              const bookmarkChapter = chapters.find(
                (c) => c.id === b.chapterId,
              );
              return (
                <li key={b.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => jumpToBookmark(b)}
                    className="focus-ring min-w-0 flex-1 rounded-lg p-2 text-left transition-colors"
                  >
                    <span
                      className="font-reading block truncate text-sm leading-snug"
                      style={{ color: "var(--ink)" }}
                    >
                      {bookmarkChapter?.title ?? r.bookmark}
                    </span>
                    <span
                      className="mt-0.5 block text-xs nums"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {b.pageNumber
                        ? `${r.pageOfShort(
                            b.pageNumber,
                            bookmarkChapter?.pageCount || b.pageNumber,
                          )} · `
                        : ""}
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <ReaderButton
                    label={r.removeBookmark}
                    onClick={() => removeBookmark(b.id)}
                  >
                    <X className="size-3.5" />
                  </ReaderButton>
                </li>
              );
            })}
          </ul>
        )}
        <p
          className="mt-auto px-2 pt-3 text-[11px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {r.annotationsLocal}
        </p>
      </div>
    ),
    [editionBookmarks, chapters, jumpToBookmark, removeBookmark, r],
  );

  /**
   * The chapter turn, at the foot of the last page (scroll mode). A
   * serialised book is read straight through, so the next release has to be
   * reachable from where the last page ends — not only from the contents.
   */
  const chapterTurn = (
    <div
      className="mx-auto mt-10 flex max-w-4xl items-center justify-between gap-4 pt-6"
      style={{ borderTop: "1px solid var(--rule)" }}
    >
      {previousChapter ? (
        <ReaderButton
          label={r.previousChapter}
          onClick={() => goToChapter(previousChapter.id)}
          className="min-w-0 flex-1 justify-start text-left"
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{previousChapter.title}</span>
        </ReaderButton>
      ) : (
        <span className="flex-1" />
      )}
      {nextChapter ? (
        <ReaderButton
          label={r.nextChapter}
          onClick={() => goToChapter(nextChapter.id)}
          className="min-w-0 flex-1 justify-end text-right"
        >
          <span className="min-w-0 truncate">{nextChapter.title}</span>
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
  );

  // Nothing to open at all — a book whose language has no chapters yet.
  // A chapter that is merely still converting is handled INSIDE the reader
  // below, so its neighbours stay one tap away.
  if (!loadingChapters && chapters.length === 0) {
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

  // The pages query is disabled until a chapter is resolved, so "not
  // loading and empty" would otherwise read as an empty chapter for the
  // frames before resolution lands — and again on every chapter turn, in
  // the gap before the new key starts fetching. No pages and no error means
  // we are still waiting; an empty ARRAY is a chapter that really has none.
  const waiting = loadingChapters || !chapterId || (!pages && !error);

  const stageActive =
    effectiveMode !== "scroll" && !waiting && !error && total > 0;

  const panelSettings: ReaderSettingsV2 = {
    ...settings,
    pageMode: pageModeSetting,
    fit: fitSetting,
  };

  return (
    <div
      className={cn(
        "reader-surface min-h-[100dvh]",
        READER_THEME_CLASS[settings.theme],
      )}
      style={{
        // The stage colour behind and around the sheets. 'theme' resolves to
        // the reader theme's own paper, so it is a no-op by default.
        background: PAGE_BACKGROUND_VALUE[settings.pageBackground],
      }}
    >
      {/* Top bar — floats over the pages and fades while reading. */}
      <ReaderBar visible={chromeVisible}>
        <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-1 px-3 sm:gap-2 sm:px-5">
          <Link
            href={`/books/${book.id}`}
            aria-label={r.close}
            title={r.close}
            className="focus-ring inline-flex items-center justify-center rounded-lg px-2.5 py-1.5"
            style={{ color: "var(--ink-soft)" }}
          >
            <X className="size-4" />
          </Link>
          <ContentsToggle onClick={() => setContentsOpen(true)} />

          {/* Book above, chapter below: in a serialised title the chapter is
              what tells you where you are. */}
          <div className="min-w-0 flex-1 text-center">
            <p
              className="font-reading truncate text-sm leading-tight"
              style={{ color: "var(--ink-soft)" }}
            >
              {book.title}
            </p>
            {chapter && (
              <p
                className="truncate text-[0.7rem] leading-tight"
                style={{ color: "var(--ink-faint)" }}
              >
                {chapter.title}
              </p>
            )}
          </div>

          <ReaderButton
            label={r.thumbnails}
            active={thumbsOpen}
            onClick={() => setThumbsOpen((open) => !open)}
          >
            <GalleryThumbnails className="size-4" />
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
          <SettingsSlot
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            label={r.settingsTitle}
          >
            {(wrapRef) => (
              <ReaderSettingsPanel
                mode="pages"
                settings={panelSettings}
                onChange={applySettings}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                dismissRef={wrapRef}
                zoom={{
                  value: zoom,
                  onZoomIn: () => changeZoom(zoom + ZOOM_STEP),
                  onZoomOut: () => changeZoom(zoom - ZOOM_STEP),
                  onReset: () => changeZoom(1),
                  canZoomIn: zoom < ZOOM_MAX,
                  canZoomOut: zoom > ZOOM_MIN,
                }}
                onRotate={rotate}
                fullscreen={fs}
              />
            )}
          </SettingsSlot>
          {fs.supported && (
            <ReaderButton
              label={fs.active ? r.exitFullscreen : r.fullscreen}
              active={fs.active}
              onClick={fs.toggle}
            >
              {fs.active ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </ReaderButton>
          )}
        </div>
      </ReaderBar>

      {/* The pages */}
      {stageActive ? (
        <PageStage
          pages={pages!}
          currentPage={currentPage}
          mode={effectiveMode === "double" ? "double" : "single"}
          fit={effectiveFit}
          zoom={zoom}
          rotation={rotation}
          direction={settings.pageDirection}
          onPrev={prevPage}
          onNext={nextPage}
          onZoomChange={changeZoom}
        />
      ) : (
        <div
          ref={containerRef}
          className="mx-auto w-full max-w-[1600px] px-3 pt-16 pb-20 sm:px-6"
        >
          {waiting ? (
            /* Ink-coloured rather than the app's white-on-dark Skeleton,
               which is invisible against paper. */
            <div className="mx-auto max-w-3xl space-y-5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="aspect-[3/4] w-full animate-pulse rounded-sm"
                  style={{
                    background:
                      "color-mix(in oklab, var(--ink) 7%, transparent)",
                  }}
                />
              ))}
            </div>
          ) : error || total === 0 ? (
            /* This chapter alone — it may still be converting while the rest
               of the book is readable, which is the whole point of publishing
               an edition on its first ready chapter. */
            <div className="mx-auto max-w-2xl py-10">
              <EmptyState
                icon={BookOpen}
                title={chapter?.title ?? book.title}
                description={error ? r.loadError : r.emptyChapter}
              />
            </div>
          ) : (
            /* Zoom widens the whole column past the viewport; this wrapper
               is the horizontal pan for it. The column uses auto margins,
               which collapse to zero on overflow so panning reaches both
               edges. */
            <div className="overflow-x-auto">
              <div
                className="mx-auto flex flex-col items-center gap-5"
                style={{
                  // min(100%, 56rem) is exactly the old max-w-4xl column;
                  // zoom multiplies the fitted width, per the zoom contract.
                  width: `calc(min(100%, 56rem) * ${zoom})`,
                }}
              >
                {pages!.map((page) => (
                  <PageSlot
                    key={page.pageNumber}
                    page={page}
                    fit={effectiveFit}
                    zoom={zoom}
                    rotation={rotation}
                    // Outside the window, only the sized box is rendered —
                    // this is what keeps a 600-page book cheap.
                    render={
                      page.pageNumber >= visibleRange.from &&
                      page.pageNumber <= visibleRange.to
                    }
                    priority={page.pageNumber === currentPage}
                    registerRef={(el) => {
                      if (el) pageRefs.current.set(page.pageNumber, el);
                      else pageRefs.current.delete(page.pageNumber);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {!waiting && chapters.length > 1 && chapterTurn}
        </div>
      )}

      {/* Thumbnail strip — overlays just above the bottom bar. */}
      <PageThumbnails
        open={thumbsOpen && !waiting && !error && total > 0}
        pages={pages ?? []}
        currentPage={currentPage}
        onSelect={goToPage}
      />

      {/* Page bar */}
      <ReaderBar visible={chromeVisible} position="bottom">
        <div className="mx-auto flex h-11 w-full max-w-[1600px] items-center justify-center gap-1.5 px-4 sm:gap-3">
          <ReaderButton
            label={r.firstPage}
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
            className="hidden sm:inline-flex"
          >
            <ChevronsLeft className="size-4" />
          </ReaderButton>
          <ReaderButton
            label={r.previousPage}
            // On the stage, page 1 still turns back a CHAPTER — only a true
            // dead end disables the button.
            disabled={
              currentPage <= 1 && (!stageActive || !previousChapter)
            }
            onClick={prevPage}
          >
            <ChevronLeft className="size-4" />
          </ReaderButton>

          <form onSubmit={handleJump} className="flex items-center gap-2">
            <Input
              value={jumpValue}
              onChange={(e) =>
                setJumpValue(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={String(currentPage)}
              aria-label={r.jumpToPage}
              inputMode="numeric"
              className="h-7 w-14 border-0 text-center text-sm nums placeholder:text-[color:var(--ink-faint)] focus-visible:ring-[color:var(--accent)]/40"
              style={{
                background: "color-mix(in oklab, var(--ink) 7%, transparent)",
                color: "var(--ink)",
              }}
            />
            <span className="text-sm nums" style={{ color: "var(--ink-faint)" }}>
              / {total}
            </span>
            <span
              className="hidden text-xs nums sm:inline"
              style={{ color: "var(--ink-faint)" }}
            >
              {Math.round(zoom * 100)}%
            </span>
          </form>

          <ReaderButton
            label={r.nextPage}
            disabled={currentPage >= total && (!stageActive || !nextChapter)}
            onClick={nextPage}
          >
            <ChevronRight className="size-4" />
          </ReaderButton>
          <ReaderButton
            label={r.lastPage}
            disabled={currentPage >= total}
            onClick={() => goToPage(total)}
            className="hidden sm:inline-flex"
          >
            <ChevronsRight className="size-4" />
          </ReaderButton>
        </div>
      </ReaderBar>

      <ContentsDrawer
        open={contentsOpen}
        onClose={() => setContentsOpen(false)}
        bookId={book.id}
        title={book.title}
        author={book.author}
        tabs={[
          { id: "contents", label: r.contents, content: contentsList },
          { id: "bookmarks", label: r.bookmarks, content: bookmarksTab },
        ]}
      />

      <ShortcutsHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        themeClass={READER_THEME_CLASS[settings.theme]}
      />

      {/* The dimmer last: "brightness" veils everything, bars included. */}
      <ReaderDimOverlay brightness={settings.brightness} />
    </div>
  );
}

/**
 * Wrapper that gives the settings trigger and its anchored panel one shared
 * "inside" element for the outside-press dismissal (the ReaderSettings
 * pattern, owned locally because this reader drives the panel directly).
 */
function SettingsSlot({
  open,
  onOpenChange,
  label,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  children: (
    wrapRef: React.RefObject<HTMLDivElement | null>,
  ) => React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative" ref={wrapRef}>
      <ReaderButton
        label={label}
        active={open}
        onClick={() => onOpenChange(!open)}
      >
        <Settings2 className="size-4" />
      </ReaderButton>
      {children(wrapRef)}
    </div>
  );
}

/**
 * One page of the scroll ribbon. Always occupies its exact aspect box,
 * whether or not the image is currently mounted — that invariant is what
 * makes the scrollbar honest and stops windowing from causing layout jumps.
 * Rotation swaps the box's aspect (the ribbon reflows around the rotated
 * sheet); zoom is applied by the column, so the box just fills its width.
 */
function PageSlot({
  page,
  fit,
  zoom,
  rotation,
  render,
  priority,
  registerRef,
}: {
  page: BookPage;
  fit: FitId;
  zoom: number;
  rotation: RotationId;
  render: boolean;
  priority: boolean;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const d = rotatedAspect(page, rotation);
  return (
    <figure
      ref={registerRef}
      data-page={page.pageNumber}
      className={cn("relative w-full overflow-hidden rounded-sm")}
      style={{
        aspectRatio: `${d.w} / ${d.h}`,
        // "Fit screen" bounds the page by viewport height rather than column
        // width — but it has to be expressed as a max-WIDTH derived from the
        // height budget. With a definite width, max-height only clamps the
        // computed height and leaves the width alone, so the sheet would
        // paint at full column width with the scan object-contain'ed into a
        // strip down the middle. Clamping the width lets the ratio drive the
        // height, which is right at any column size. dvh, for Safari's URL
        // bar; zoom multiplies the fitted size, same as everywhere else.
        maxWidth:
          fit === "screen"
            ? `calc((100dvh - 8rem) * ${d.w} / ${d.h} * ${zoom})`
            : undefined,
        // The top bar floats over the pages, so a page scrolled to with
        // scrollIntoView would tuck its first lines underneath it. This is
        // the bar's height plus the notch.
        scrollMarginTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
        // A scanned page is a sheet lying on the reading surface: white
        // stock, a hairline edge and a soft drop shadow. Without this the
        // scan's own white bleeds into the paper background and the page
        // stops having edges.
        background: "#ffffff",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.16), 0 8px 24px -8px rgba(0,0,0,0.28)",
        outline: "1px solid var(--rule)",
        outlineOffset: "-1px",
      }}
    >
      {render ? (
        <RotatedPageImage
          page={page}
          rotation={rotation}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 896px"
        />
      ) : (
        <div aria-hidden className="size-full" />
      )}
      {/* The folio, set on the sheet itself the way a printed page numbers
          itself — not a badge floating above the image. */}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-black/45 nums">
        {page.pageNumber}
      </figcaption>
    </figure>
  );
}
