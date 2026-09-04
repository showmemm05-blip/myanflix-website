"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Film,
  LayoutGrid,
  Music,
  type LucideIcon,
} from "lucide-react";

import { isActiveHref } from "@/components/system/nav";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * THE MEDIA SWITCH — one segmented control for the whole media library.
 *
 * The main navbar carries a single "Media" entry; the split into
 * All | Movies | Books | Music happens here, INSIDE the section, as a compact
 * pill control rather than four competing top-level links. It is sticky (under
 * the mobile top bar, at the very top on desktop where the rail owns the left
 * edge), so the category switch is always one glance and one tap away without
 * spending more than one slim bar of chrome.
 *
 * The active pill is a single shared `layoutId` element: because this
 * component lives in the /media LAYOUT it survives route changes, so on
 * navigation framer-motion slides the pill from the old category to the new
 * one instead of blinking it.
 *
 * The bar earns its background rather than being born with one. At rest it is
 * fully transparent, so the section header and the aurora behind it read as
 * one continuous surface; the tinted, blurred plate and its hairline only fade
 * in once the bar is actually STUCK and page content has started passing
 * underneath, which is the only moment the pills need something to sit on.
 */
interface MediaNavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** "All" lives at the section root, so only an exact match may light it. */
  exact?: boolean;
}

export function MediaNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /**
   * A 1px sentinel directly above the bar tells us when the bar is stuck —
   * no scroll listener firing on every frame, and no magic number tied to the
   * header's height, which is free to change without breaking this.
   *
   * The rootMargin is the one thing that has to match the bar's own offsets:
   * it parks under the mobile TopBar (top-14 = 56px) but at the very top on
   * desktop (lg:top-0), so the sentinel has to leave the viewport by that same
   * amount for "stuck" to be exact at both sizes.
   */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | null = null;

    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => setStuck(!entry.isIntersecting),
        { rootMargin: desktop.matches ? "0px" : "-56px 0px 0px 0px" },
      );
      observer.observe(el);
    };

    observe();
    desktop.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      desktop.removeEventListener("change", observe);
    };
  }, []);

  const items: MediaNavItem[] = [
    {
      key: "all",
      href: "/media",
      label: t.search.all,
      icon: LayoutGrid,
      exact: true,
    },
    {
      key: "movies",
      href: "/media/movies",
      label: t.search.movies,
      icon: Film,
    },
    {
      key: "books",
      href: "/media/books",
      label: t.search.books,
      icon: BookOpen,
    },
    { key: "music", href: "/media/music", label: t.search.music, icon: Music },
  ];

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px shrink-0" />
      <div
        className={cn(
          "sticky top-14 z-30 transition-colors duration-300 ease-out lg:top-0",
          stuck
            ? "border-b border-white/[0.06] bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <nav
            aria-label={t.nav.media}
            className="scrollbar-none -mx-1 flex items-center overflow-x-auto px-1 py-2.5"
          >
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10 ring-inset">
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : isActiveHref(pathname, item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring relative flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-out sm:px-4",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="media-nav-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-white/10 shadow-e1 ring-1 ring-white/15 ring-inset"
                        transition={{
                          type: "spring",
                          bounce: 0.18,
                          duration: 0.5,
                        }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative hidden size-4 sm:block",
                        active ? "text-primary" : "text-muted-foreground/70",
                      )}
                    />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
