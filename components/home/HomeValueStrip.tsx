"use client";

import Link from "next/link";

import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { ChevronRightIcon } from "@/components/system";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";

/** The board's stroke icons (24 × 24, 1.75). */
const ICONS = {
  stories:
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4",
  hd: "M5 12.5a7 7 0 0 1 14 0M8.5 16a3.5 3.5 0 0 1 7 0M12 19.5h.01M2 9a10 10 0 0 1 20 0",
  books: "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5",
  pay: "M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM15 12h2.5",
} as const;

/**
 * "WHY MYANFLIX" (HomeWeb.dc.html §2): four raised tiles, static and
 * translated, stating only what is true today — movies, series and books in
 * one app; streams that adapt from 240p to 720p; books with chapters, free
 * once signed in; KBZPay or WavePay. Each tile goes somewhere
 * useful (a guest's Books and Wallet tiles go through sign-in). Four
 * columns, two on phones.
 */
export function HomeValueStrip() {
  const h = useSection(homeText);
  const { isAuthenticated } = useAuth();

  const tiles = [
    { key: "stories", name: h.valueStoriesName, line: h.valueStoriesLine, href: MEDIA_CHIP_HREF.movies, icon: ICONS.stories },
    { key: "hd", name: h.valueHdName, line: h.valueHdLine, href: MEDIA_CHIP_HREF.movies, icon: ICONS.hd },
    {
      key: "books",
      name: h.valueBooksName,
      line: h.valueBooksLine,
      href: isAuthenticated ? MEDIA_CHIP_HREF.books : loginHref(MEDIA_CHIP_HREF.books),
      icon: ICONS.books,
    },
    {
      key: "pay",
      name: h.valuePayName,
      line: h.valuePayLine,
      href: isAuthenticated ? "/wallet" : loginHref("/wallet"),
      icon: ICONS.pay,
    },
  ];

  return (
    <section aria-label={h.whyMyanflix} className="mt-[clamp(28px,3vw,40px)] px-gutter">
      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 desk:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.key} className="min-w-0">
            <Link
              href={tile.href}
              aria-label={h.valueTile(tile.name, tile.line)}
              className="flex h-full min-h-32 flex-col justify-between gap-3.5 rounded-[16px] bg-surface p-4 text-fg shadow-[inset_0_0_0_1px_var(--mq-hairline)] transition-colors duration-200 outline-none hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex size-10 items-center justify-center rounded-[12px] bg-crimson/14">
                  <svg
                    aria-hidden
                    focusable={false}
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-link"
                  >
                    <path d={tile.icon} />
                  </svg>
                </span>
                <ChevronRightIcon size={18} strokeWidth={2.2} className="text-fg-faint" />
              </span>
              <span className="flex flex-col">
                <span className="text-base leading-[22px] font-extrabold text-fg">{tile.name}</span>
                <span className="text-[13px] leading-[18px] text-fg-muted">{tile.line}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
