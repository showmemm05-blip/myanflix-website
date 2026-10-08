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
    <nav
      // inert, not just opacity-0: a hidden strip must not leave hundreds of
      // page buttons in the tab order (the ContentsDrawer precedent).
      inert={!open}
      aria-label={t.book.reader.thumbnails}
      className={cn(
        "reader-thumb-strip fixed inset-x-0 z-40 backdrop-blur-[20px]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
      style={{
        // Sits on the page bar's shoulder: the bar is 64px plus the
        // home-indicator inset it absorbs.
        bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
        background: "color-mix(in oklab, var(--paper) 94%, transparent)",
        boxShadow: "inset 0 1px 0 var(--rule)",
      }}
    >
      <div className="scrollbar-none flex h-28 snap-x items-center gap-2.5 overflow-x-auto px-gutter py-3">
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
                className={cn(
                  "focus-ring relative h-[82px] shrink-0 cursor-pointer snap-center overflow-hidden rounded-[3px] border-0 p-0 transition-transform duration-150 hover:-translate-y-0.5",
                  !current && "opacity-[0.82]",
                )}
                style={{
                  aspectRatio: `${page.width} / ${page.height}`,
                  // A scanned sheet is white stock whatever the theme.
                  background: "#ffffff",
                  boxShadow: current
                    ? "0 0 0 2px var(--paper), 0 0 0 4px var(--mq-crimson)"
                    : "0 2px 6px rgba(0,0,0,0.35)",
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
                <span className="pointer-events-none absolute inset-x-0 bottom-[3px] text-center text-[10px] leading-3 font-bold text-black/55 tabular-nums">
                  {page.pageNumber}
                </span>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
