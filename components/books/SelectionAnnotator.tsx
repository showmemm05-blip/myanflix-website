"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import {
  HIGHLIGHT_COLORS,
  getAnnotations,
  useAnnotations,
  type Highlight,
  type HighlightColor,
} from "./reader-annotations";

/**
 * Selection → highlight UX for the text reader.
 *
 * Three responsibilities, all scoped to the article container:
 *  1. a floating toolbar above any text selection (4 color dots + Note + Copy)
 *  2. painting stored highlights as <mark data-anno-id> wrappers over the
 *     block's text nodes
 *  3. a popover on mark click — recolor, edit the note, copy, remove.
 *
 * Everything is positioned `absolute` inside the article's `relative`
 * wrapper, NEVER inside a ReaderBar: the bars carry a translate, and a
 * transformed ancestor traps fixed/absolute descendants (the transform law).
 */

/** The --hl-* vars are translucent washes for text; the dots need solid ink. */
const DOT_COLOR: Record<HighlightColor, string> = {
  yellow: "#f5c542",
  green: "#7cb663",
  blue: "#5e9cd3",
  pink: "#e07ba0",
};

interface Anchor {
  blockIndex: number;
  start: number;
  end: number;
  excerpt: string;
}

/**
 * Wrap [start, end) of a block's raw textContent in <mark> elements — one per
 * intersected text node, because a highlight routinely crosses <em>/<strong>
 * boundaries and Range#surroundContents throws on exactly that. Returns the
 * marks it made.
 */
export function wrapBlockRange(
  block: Element,
  start: number,
  end: number,
  decorate: (mark: HTMLElement) => void,
): HTMLElement[] {
  const marks: HTMLElement[] = [];
  if (end <= start) return marks;
  // Collect first, mutate after: splitText while walking confuses the walker.
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const targets: { node: Text; s: number; e: number }[] = [];
  let pos = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.data.length;
    const s = Math.max(start - pos, 0);
    const e = Math.min(end - pos, len);
    if (s < e) targets.push({ node, s, e });
    pos += len;
    if (pos >= end) break;
  }
  for (const { node, s, e } of targets) {
    let target = node;
    if (s > 0) target = target.splitText(s);
    if (e - s < target.data.length) target.splitText(e - s);
    const mark = document.createElement("mark");
    decorate(mark);
    target.parentNode?.replaceChild(mark, target);
    mark.appendChild(target);
    marks.push(mark);
  }
  return marks;
}

/** Undo every mark this module painted, leaving the DOM byte-identical. */
function unpaint(container: HTMLElement) {
  for (const mark of Array.from(
    container.querySelectorAll("mark.reader-highlight"),
  )) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}

/**
 * Resolve a highlight against the CURRENT text of its block. Offsets are
 * tried first; when edits (or whitespace differences) have shifted them, the
 * excerpt is the repair anchor; when even that is gone the highlight is an
 * orphan — still listed and deletable in the drawer, just not painted.
 */
function resolveRange(
  block: Element,
  h: Highlight,
): { start: number; end: number } | null {
  const text = block.textContent ?? "";
  if (h.start === undefined || h.end === undefined) {
    // Whole-block anchor.
    return text.length > 0 ? { start: 0, end: text.length } : null;
  }
  if (text.slice(h.start, h.end) === h.excerpt)
    return { start: h.start, end: h.end };
  const idx = text.indexOf(h.excerpt);
  if (idx === -1) return null;
  return { start: idx, end: idx + h.excerpt.length };
}

function ColorDot({
  color,
  selected,
  label,
  onClick,
}: {
  color: HighlightColor;
  selected?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      // pointerdown would collapse the selection before click fires.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-full"
    >
      <span
        aria-hidden
        className="size-4.5 rounded-full"
        style={{
          background: DOT_COLOR[color],
          boxShadow: selected ? "0 0 0 2px var(--accent)" : "none",
          border: "1px solid rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export function SelectionAnnotator({
  containerRef,
  userId,
  bookId,
  editionId,
  chapterId,
  contentReady,
  /** Changes whenever the article DOM is rebuilt (mode switch) — repaint cue. */
  paintSignal,
  onActivityChange,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  userId: string | null | undefined;
  bookId: string;
  editionId: string;
  chapterId: string | null;
  contentReady: boolean;
  paintSignal?: unknown;
  onActivityChange?: (active: boolean) => void;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const { highlights, addHighlight, updateHighlight, removeHighlight } =
    useAnnotations(userId, bookId);

  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [popover, setPopover] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const active = toolbar !== null || popover !== null;
  useEffect(() => {
    onActivityChange?.(active);
  }, [active, onActivityChange]);

  // ── Selection toolbar ────────────────────────────────────────────────────

  useEffect(() => {
    if (!contentReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToolbar(null);
      return;
    }
    const onSelectionChange = () => {
      const container = containerRef.current;
      const sel = window.getSelection();
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const node =
        range.commonAncestorContainer instanceof Element
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      if (!node || !container.contains(node)) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setToolbar({
        top: rect.top - containerRect.top - 44,
        left: Math.min(
          Math.max(rect.left - containerRect.left + rect.width / 2, 90),
          containerRect.width - 90,
        ),
      });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [contentReady, containerRef]);

  /**
   * The anchor: {blockIndex, start, end} as offsets into the block's RAW
   * textContent (data-block-index stamped by ChapterContent). A selection
   * spanning several blocks clamps to its first block — one highlight, one
   * block, the same law the store and mobile hold to.
   */
  const captureAnchor = useCallback((): Anchor | null => {
    const container = containerRef.current;
    const sel = window.getSelection();
    if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed)
      return null;
    const range = sel.getRangeAt(0);
    const startEl =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    const block = startEl?.closest("[data-block-index]");
    if (!block || !container.contains(block)) return null;
    const blockIndex = Number(block.getAttribute("data-block-index"));
    if (!Number.isInteger(blockIndex)) return null;

    const pre = document.createRange();
    pre.selectNodeContents(block);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;

    const endEl =
      range.endContainer instanceof Element
        ? range.endContainer
        : range.endContainer.parentElement;
    let end: number;
    if (endEl?.closest("[data-block-index]") === block) {
      const preEnd = document.createRange();
      preEnd.selectNodeContents(block);
      preEnd.setEnd(range.endContainer, range.endOffset);
      end = preEnd.toString().length;
    } else {
      end = (block.textContent ?? "").length;
    }
    if (end <= start) return null;
    return {
      blockIndex,
      start,
      end,
      excerpt: (block.textContent ?? "").slice(start, end),
    };
  }, [containerRef]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  };

  const createHighlight = (color: HighlightColor, withNote: boolean) => {
    if (!chapterId) return;
    const anchor = captureAnchor();
    if (!anchor) return;
    const result = addHighlight({
      editionId,
      chapterId,
      blockIndex: anchor.blockIndex,
      start: anchor.start,
      end: anchor.end,
      excerpt: anchor.excerpt,
      color,
    });
    if (!result.ok) {
      if (result.reason === "limit") toast(r.annotationLimit);
      return;
    }
    clearSelection();
    if (withNote) {
      // The id is minted inside the store — the entry just appended is ours.
      const state = getAnnotations(userId, bookId);
      const added = state.highlights[state.highlights.length - 1];
      if (added) {
        setNoteDraft("");
        openPopoverForId(added.id, anchor.blockIndex);
      }
    }
  };

  const copySelection = () => {
    const text = String(window.getSelection() ?? "");
    if (!text) return;
    navigator.clipboard?.writeText(text).then(
      () => toast(r.copied),
      () => {},
    );
    clearSelection();
  };

  // ── Painting ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !contentReady || !chapterId) return;
    unpaint(container);
    for (const h of highlights) {
      if (h.chapterId !== chapterId || h.editionId !== editionId) continue;
      const block = container.querySelector(
        `[data-block-index="${h.blockIndex}"]`,
      );
      if (!block) continue;
      const range = resolveRange(block, h);
      if (!range) continue; // Orphan — list-only, still deletable.
      wrapBlockRange(block, range.start, range.end, (mark) => {
        mark.className = "reader-highlight";
        mark.dataset.annoId = h.id;
        mark.dataset.annoColor = h.color;
        if (h.note) mark.dataset.hasNote = "";
      });
    }
    return () => {
      // The article may already have been torn down with the chapter.
      if (container.isConnected) unpaint(container);
    };
  }, [highlights, chapterId, editionId, contentReady, paintSignal, containerRef]);

  // ── Mark click → popover ─────────────────────────────────────────────────

  const openPopoverForId = (id: string, blockIndex: number) => {
    const container = containerRef.current;
    if (!container) return;
    const mark = container.querySelector<HTMLElement>(
      `mark.reader-highlight[data-anno-id="${CSS.escape(id)}"]`,
    );
    const anchorEl =
      mark ??
      container.querySelector<HTMLElement>(
        `[data-block-index="${blockIndex}"]`,
      );
    const containerRect = container.getBoundingClientRect();
    const rect = anchorEl?.getBoundingClientRect();
    const state = getAnnotations(userId, bookId);
    const entry = state.highlights.find((h) => h.id === id);
    setNoteDraft(entry?.note ?? "");
    setPopover({
      id,
      top: rect ? rect.bottom - containerRect.top + 8 : 0,
      left: rect
        ? Math.min(
            Math.max(rect.left - containerRect.left + rect.width / 2, 140),
            containerRect.width - 140,
          )
        : containerRect.width / 2,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !contentReady) return;
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest?.(
        "mark.reader-highlight",
      ) as HTMLElement | null;
      if (!mark || !mark.dataset.annoId) return;
      e.stopPropagation();
      const h = highlights.find((x) => x.id === mark.dataset.annoId);
      if (h) openPopoverForId(h.id, h.blockIndex);
    };
    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentReady, highlights, chapterId, containerRef]);

  // Escape / outside press close the popover.
  useEffect(() => {
    if (!popover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPopover(null);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const el = popoverRef.current;
      const target = e.target as HTMLElement;
      if (el && !el.contains(target) && !target.closest?.("mark.reader-highlight"))
        setPopover(null);
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [popover]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const current = popover
    ? highlights.find((h) => h.id === popover.id)
    : undefined;

  // A deleted-elsewhere highlight closes its own popover.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (popover && !current) setPopover(null);
  }, [popover, current]);

  const surface: React.CSSProperties = {
    background: "var(--paper-raised)",
    border: "1px solid var(--rule)",
    color: "var(--ink)",
  };

  return (
    <>
      {toolbar && (
        <div
          role="toolbar"
          aria-label={r.highlight}
          className="absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1 shadow-e3"
          style={{ top: toolbar.top, left: toolbar.left, ...surface }}
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <ColorDot
              key={color}
              color={color}
              label={
                { yellow: r.hlYellow, green: r.hlGreen, blue: r.hlBlue, pink: r.hlPink }[
                  color
                ]
              }
              onClick={() => createHighlight(color, false)}
            />
          ))}
          <span
            aria-hidden
            className="mx-0.5 h-4 w-px"
            style={{ background: "var(--rule)" }}
          />
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => createHighlight("yellow", true)}
            className="focus-ring rounded-full px-2 py-1 text-xs"
            style={{ color: "var(--ink-soft)" }}
          >
            {r.note}
          </button>
          <button
            type="button"
            aria-label={r.copyAction}
            title={r.copyAction}
            onPointerDown={(e) => e.preventDefault()}
            onClick={copySelection}
            className="focus-ring rounded-full px-1.5 py-1"
            style={{ color: "var(--ink-soft)" }}
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      )}

      {popover && current && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={r.highlight}
          className="absolute z-30 w-[17.5rem] -translate-x-1/2 rounded-xl p-3 shadow-e3"
          style={{ top: popover.top, left: popover.left, ...surface }}
        >
          <div className="mb-2 flex items-center gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <ColorDot
                key={color}
                color={color}
                selected={current.color === color}
                label={
                  { yellow: r.hlYellow, green: r.hlGreen, blue: r.hlBlue, pink: r.hlPink }[
                    color
                  ]
                }
                onClick={() => updateHighlight(current.id, { color })}
              />
            ))}
            <span className="flex-1" />
            <button
              type="button"
              aria-label={r.copyAction}
              title={r.copyAction}
              onClick={() => {
                navigator.clipboard?.writeText(current.excerpt).then(
                  () => toast(r.copied),
                  () => {},
                );
              }}
              className="focus-ring rounded-lg p-1.5"
              style={{ color: "var(--ink-soft)" }}
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={r.removeHighlight}
              title={r.removeHighlight}
              onClick={() => {
                removeHighlight(current.id);
                setPopover(null);
              }}
              className="focus-ring rounded-lg p-1.5"
              style={{ color: "var(--ink-soft)" }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          <textarea
            ref={noteInputRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={r.notePlaceholder}
            rows={3}
            className={cn(
              "focus-ring w-full resize-none rounded-lg p-2 text-sm",
            )}
            style={{
              background: "color-mix(in oklab, var(--ink) 6%, transparent)",
              border: "1px solid var(--rule)",
              color: "var(--ink)",
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                updateHighlight(current.id, { note: noteDraft.trim() });
                setPopover(null);
              }}
              className="focus-ring rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--paper)",
              }}
            >
              {r.saveNote}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
