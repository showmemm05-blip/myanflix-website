"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { BookPage } from "@/types/book";

/**
 * The thumbnail strip — a horizontal ribbon of the chapter's pages overlaid
 * just above the bottom bar (toggled by `g` or the toolbar button; the
 * reader counts it as an open panel, so the chrome stays pinned under it).
 *
 * Plain DOM, no virtualisation: even a long chapter is a few hundred 96px
 * images, and next/image lazy-loads everything off-strip — the cheap thing
 * is to let the browser do its job.
 */
export function PageThumbnails({
  open,
  pages,
  currentPage,
  onSelect,
}: {
  open: boolean;
  pages: BookPage[];
  currentPage: number;
  onSelect: (pageNumber: number) => void;
}) {
  const { t } = useLanguage();
  const currentRef = useRef<HTMLButtonElement>(null);

  // Never mounted until first opened: a closed strip must not cost a single
  // thumbnail request. After that it stays mounted so reopening is instant.
  // Render-phase adjustment, not an effect — the ReaderChrome precedent.
  const [openedOnce, setOpenedOnce] = useState(false);
  if (open && !openedOnce) setOpenedOnce(true);

  // Keep the reading position centred in the strip — on open, and as the
  // reader turns pages with the strip up.
  useEffect(() => {
    if (!open) return;
    currentRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [open, currentPage]);

  return (
    <div
      // inert, not just opacity-0: a hidden strip must not leave hundreds of
      // page buttons in the tab order (the ContentsDrawer precedent).
      inert={!open}
      className={cn(
        "reader-thumb-strip fixed inset-x-0 z-40",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
      style={{
        // Sits on the bottom bar's shoulder: the bar is h-11 (2.75rem) plus
        // the home-indicator inset it absorbs.
        bottom: "calc(2.75rem + env(safe-area-inset-bottom, 0px))",
        background: "var(--paper)",
        borderTop: "1px solid var(--rule)",
      }}
    >
      <div className="flex h-24 snap-x items-center gap-2 overflow-x-auto px-3 py-2">
        {openedOnce &&
          pages.map((page) => {
            const current = page.pageNumber === currentPage;
            return (
              <button
                key={page.pageNumber}
                ref={current ? currentRef : undefined}
                type="button"
                onClick={() => onSelect(page.pageNumber)}
                aria-label={t.book.reader.pageOfShort(
                  page.pageNumber,
                  pages.length,
                )}
                aria-current={current ? "true" : undefined}
                className="focus-ring relative h-full shrink-0 snap-center overflow-hidden rounded-sm"
                style={{
                  aspectRatio: `${page.width} / ${page.height}`,
                  background: "#ffffff",
                  outline: current
                    ? "2px solid var(--accent)"
                    : "1px solid var(--rule)",
                  outlineOffset: "-2px",
                }}
              >
                <Image
                  src={page.url}
                  alt=""
                  fill
                  sizes="96px"
                  loading="lazy"
                  className="object-contain"
                  unoptimized
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[10px] text-black/50 nums">
                  {page.pageNumber}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
