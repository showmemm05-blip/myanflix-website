"use client";

import Link from "next/link";

import { BookCard, BookCardSkeleton } from "@/components/cards";
import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { isRecent } from "@/components/media/media-data";
import { Artwork, ChevronRightIcon, LockIcon, Rail } from "@/components/system";
import { buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { mediaText } from "@/lib/i18n/sections/media";
import type { Book } from "@/types/book";
import { useHomeBooks } from "./home-data";

/** The board's fan: right %, top %, rotation (deg) for the four covers, front to back. */
const FAN = [
  [6, 18, 8],
  [24, 10, 0],
  [42, 16, -8],
  [58, 26, -14],
] as const;

/** Seeds for the drawn covers a guest sees (decoration — no titles, no /books call). */
const GUEST_SEEDS = ["shelf-monsoon", "shelf-river", "shelf-teak", "shelf-lamps"] as const;

/**
 * "READ ON MYANFLIX" (HomeWeb.dc.html §8): a panel with the pitch on the
 * left and four fanned covers on the right; under it, for members, the
 * "New on the shelf" rail of the newest books (the row that used to stand
 * alone on Home — same GET /books call, same rules).
 *
 *  - Members: the fan is the real newest books' covers, "Open the shelf".
 *  - Guests: drawn covers, the crimson "Sign in to read"; GET /books is 401
 *    for a guest, so nothing is asked.
 *
 * Books have no access type — they are free to read once signed in.
 */
export function HomeBooksBand() {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const m = useSection(mediaText);
  const { isAuthenticated } = useAuth();
  const books = useHomeBooks(isAuthenticated);
  const items: Book[] = isAuthenticated ? (books.data ?? []) : [];
  const fan = items.slice(0, FAN.length);

  return (
    <section aria-labelledby="home-books-title" className="px-gutter">
      <div className="overflow-hidden rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_var(--mq-hairline)]">
        <div className="grid items-stretch desk:grid-cols-2">
          <div className="flex flex-col justify-center p-[clamp(24px,3vw,44px)]">
            <p className="m-0 flex items-center gap-2 text-sm leading-5 font-extrabold text-link">
              <svg
                aria-hidden
                focusable={false}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5" />
              </svg>
              {m.books}
            </p>
            <h2
              id="home-books-title"
              className="mt-2.5 text-[clamp(26px,2.4vw,34px)] leading-[1.15] font-black tracking-[-0.03em] text-fg"
            >
              {h.readOnMyanflix}
            </h2>
            <p className="mt-2.5 max-w-[44ch] text-base leading-[25px] text-fg-muted">{h.booksPitch}</p>
            <div className="mt-[22px] flex flex-wrap items-center gap-x-4 gap-y-3">
              {isAuthenticated ? (
                <Link href={MEDIA_CHIP_HREF.books} className={buttonVariants({ variant: "tonal", size: "cta" })}>
                  {h.openShelf}
                  <ChevronRightIcon size={16} strokeWidth={2.2} />
                </Link>
              ) : (
                <Link href={loginHref(MEDIA_CHIP_HREF.books)} className={buttonVariants({ variant: "commit", size: "cta" })}>
                  <LockIcon size={16} strokeWidth={2} />
                  {h.signInToRead}
                </Link>
              )}
              <span className="text-sm leading-5 text-fg-faint">{h.booksFree}</span>
            </div>
          </div>

          <div aria-hidden className="relative min-h-[300px] overflow-hidden bg-[#1A1510] max-desk:order-first max-desk:min-h-[220px]">
            <svg width="100%" height="100%" viewBox="0 0 240 135" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
              <rect width="240" height="135" fill="#1A1510" />
              <circle cx="120" cy="56" r="60" fill="#F2C66B" opacity="0.1" />
              <path d="M0 112 C60 104 120 108 180 100 C206 96 226 98 240 96 V135 H0 Z" fill="#0E0B07" />
            </svg>
            {FAN.map(([right, top, rotate], i) => {
              const book = fan[i];
              return (
                <span
                  key={i}
                  className="absolute block aspect-[5/7] w-[30%] overflow-hidden rounded-[3px_10px_10px_3px] bg-raised shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
                  style={{ right: `${right}%`, top: `${top}%`, transform: `rotate(${rotate}deg)`, zIndex: FAN.length - i }}
                >
                  <Artwork
                    src={book?.coverUrl ?? null}
                    seed={book?.title ?? GUEST_SEEDS[i]}
                    variant="book"
                    sizes="(max-width: 719px) 30vw, 15vw"
                    zoomOnHover={false}
                  >
                    {book && (
                      <span className="absolute top-[10%] right-[8%] left-[12%] text-[clamp(12px,1.1vw,16px)] leading-[1.1] font-black text-white">
                        {book.title}
                      </span>
                    )}
                  </Artwork>
                </span>
              );
            })}
          </div>
        </div>

        {isAuthenticated && (books.isLoading || items.length > 0) && (
          <div className="pb-[clamp(20px,2vw,28px)] shadow-[inset_0_1px_0_var(--mq-hairline)]">
            <div className="flex items-end justify-between gap-4 px-[clamp(20px,2.5vw,36px)] pt-5">
              <h3 className="m-0 text-[17px] leading-6 font-extrabold text-fg">{t.media.newBooks}</h3>
              <Link
                href={MEDIA_CHIP_HREF.books}
                className="mq-link rounded-[6px] text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                {m.allBooks}
              </Link>
            </div>
            <Rail className="gap-5 px-[clamp(20px,2.5vw,36px)] pt-3.5">
              {books.isLoading
                ? Array.from({ length: 6 }, (_, i) => <BookCardSkeleton key={i} layout="rail" />)
                : items.map((book) => (
                    <BookCard
                      key={book.id}
                      layout="rail"
                      title={book.title}
                      author={book.author}
                      href={`/books/${book.id}`}
                      coverUrl={book.coverUrl}
                      meta={m.bookMeta(book.author, t.book.chapterCount(book.editions[0]?.chapterCount ?? 0))}
                      isNew={isRecent(book.createdAt)}
                    />
                  ))}
            </Rail>
          </div>
        )}
      </div>
    </section>
  );
}
