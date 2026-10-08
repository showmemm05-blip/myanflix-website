"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { cn } from "@/lib/utils";
import {
  HIGHLIGHT_COLORS,
  getAnnotations,
  useAnnotations,
  type Highlight,
  type HighlightColor,
} from "./reader-annotations";
import { MARQUEE_PANEL_VARS } from "./ReaderChrome";
import { CopyIcon, NoteIcon, TrashIcon } from "./reader-icons";

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
export const DOT_COLOR: Record<HighlightColor, string> = {
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

/**
 * The small speech-bubble button after a highlight that carries a note
 * (Reader.dc.html: 28px, muted ink, opens the note). Built as plain DOM
 * because the marks around it are too. It holds no text, so the block's
 * textContent — which every highlight offset is measured against — is
 * unchanged. The negative vertical margin keeps it from opening up the line.
 */
const NOTE_BUTTON_CLASS =
  "reader-note-btn mx-0.5 -my-1.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 align-middle text-[var(--ink-soft)] transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeNoteButton(highlightId: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = NOTE_BUTTON_CLASS;
  button.dataset.annoNoteFor = highlightId;
  button.setAttribute("aria-label", label);
  button.title = label;
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.75",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(k, v);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    "M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  );
  svg.appendChild(path);
  button.appendChild(svg);
  return button;
}

/** Undo every mark this module painted, leaving the DOM byte-identical. */
function unpaint(container: HTMLElement) {
  for (const button of Array.from(
    container.querySelectorAll("button[data-anno-note-for]"),
  ))
    button.remove();
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
      className="focus-ring flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
    >
      <span
        aria-hidden
        className="size-6 rounded-full"
        style={{
          background: DOT_COLOR[color],
          boxShadow: selected ? "0 0 0 2px var(--mq-popover), 0 0 0 4px var(--mq-fg)" : "none",
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
  const noteButtonLabel = useSection(playText).noteOnHighlight;
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
        // The toolbar is 52px tall and floats 8px above the selection.
        top: rect.top - containerRect.top - 60,
        left: Math.min(
          // Half the toolbar's width, so it never hangs off either edge.
          Math.max(rect.left - containerRect.left + rect.width / 2, 150),
          containerRect.width - 150,
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
      const marks = wrapBlockRange(block, range.start, range.end, (mark) => {
        mark.className = "reader-highlight";
        mark.dataset.annoId = h.id;
        mark.dataset.annoColor = h.color;
        if (h.note) mark.dataset.hasNote = "";
      });
      const last = marks[marks.length - 1];
      if (h.note && last) last.after(makeNoteButton(h.id, noteButtonLabel));
    }
    return () => {
      // The article may already have been torn down with the chapter.
      if (container.isConnected) unpaint(container);
    };
  }, [highlights, chapterId, editionId, contentReady, paintSignal, containerRef, noteButtonLabel]);

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
            Math.max(rect.left - containerRect.left + rect.width / 2, 148),
            containerRect.width - 148,
          )
        : containerRect.width / 2,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !contentReady) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // The note button after a highlight opens the same popover as the mark.
      const noteButton = target.closest?.(
        "button[data-anno-note-for]",
      ) as HTMLElement | null;
      const mark = target.closest?.(
        "mark.reader-highlight",
      ) as HTMLElement | null;
      const id = noteButton?.dataset.annoNoteFor ?? mark?.dataset.annoId;
      if (!id) return;
      e.stopPropagation();
      const h = highlights.find((x) => x.id === id);
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
      if (
        el &&
        !el.contains(target) &&
        !target.closest?.("mark.reader-highlight, button[data-anno-note-for]")
      )
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

  // Always the dark Marquee pop-up, whatever the reading theme.
  const surface: React.CSSProperties = MARQUEE_PANEL_VARS;
  const toolButton =
    "focus-ring flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-0 bg-transparent text-fg transition-colors hover:bg-tonal-ghost";

  return (
    <>
      {toolbar && (
        <div
          role="toolbar"
          aria-label={r.highlight}
          className="absolute z-30 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[14px] bg-popover pr-1.5 pl-2.5 text-fg shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
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
          <span aria-hidden className="mx-1 h-6 w-px bg-white/14" />
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => createHighlight("yellow", true)}
            className={cn(toolButton, "px-3 text-sm font-bold")}
          >
            <NoteIcon size={16} />
            {r.note}
          </button>
          <button
            type="button"
            aria-label={r.copyAction}
            title={r.copyAction}
            onPointerDown={(e) => e.preventDefault()}
            onClick={copySelection}
            className={cn(toolButton, "w-10")}
          >
            <CopyIcon size={17} />
          </button>
        </div>
      )}

      {popover && current && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={r.highlight}
          className="absolute z-30 w-[18rem] -translate-x-1/2 rounded-[16px] bg-popover p-3 text-fg shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
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
              className={cn(toolButton, "w-10 text-fg-muted hover:text-fg")}
            >
              <CopyIcon size={17} />
            </button>
            <button
              type="button"
              aria-label={r.removeHighlight}
              title={r.removeHighlight}
              onClick={() => {
                removeHighlight(current.id);
                setPopover(null);
              }}
              className={cn(toolButton, "w-10 text-fg-muted hover:text-fg")}
            >
              <TrashIcon size={18} />
            </button>
          </div>

          <textarea
            ref={noteInputRef}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={r.notePlaceholder}
            aria-label={r.note}
            rows={3}
            className="block w-full resize-none rounded-[12px] border-0 bg-raised p-3 text-sm leading-5 text-fg outline-none placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                updateHighlight(current.id, { note: noteDraft.trim() });
                setPopover(null);
              }}
              className="focus-ring h-10 cursor-pointer rounded-[12px] border-0 bg-crimson px-4 text-sm font-extrabold text-fg transition-opacity hover:opacity-[0.88] active:scale-[0.97]"
            >
              {r.saveNote}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
