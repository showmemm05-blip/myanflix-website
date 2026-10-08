"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { AGE_RATING_LABELS } from "@/components/filters/filter-types";
import { Artwork, CheckIcon, CrownIcon, PlayIcon, PlusIcon, Tag } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { shellText } from "@/lib/i18n/sections/shell";
import type { AgeRating } from "@/types/movie";
import { PromoVisual } from "./PromoArt";
import { promoText, titleHref, type ShowcaseSpotlight } from "./showcase-model";

/**
 * THE SPOTLIGHT BANNER (HomeWeb.dc.html §4): one wide 21:8 card (4:5 on
 * phones) for the admin's live SPOTLIGHT promo — a movie, series or book
 * with an optional kicker, line and picture of its own — or, when none is
 * set, the newest published movie (the server decides; `null` = no banner).
 *
 * The whole card opens the title; the buttons sit above that link: a movie
 * gets the white Play (or the gold "Subscribe to watch" when it is Premium
 * and the viewer is not subscribed) and My List; a series gets Play into
 * its page; a book gets "Read now". The kicker is the admin's words, or
 * "Newest on MyanFlix" for the fallback — never "new this week" unless the
 * admin wrote it, because nothing here knows when a title was added.
 */
export function HomeSpotlight({ spotlight }: { spotlight: ShowcaseSpotlight | null }) {
  const { t, language } = useLanguage();
  const h = useSection(homeText);
  const s = useSection(shellText);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  if (!spotlight) return null;
  const { title: item, promo, source } = spotlight;
  const text = promo ? promoText(promo, language) : null;
  const kicker = text?.kicker ?? (source === "PROMO" ? h.spotlight : h.newestOnMyanflix);
  const line = text?.body ?? item.description;
  const href = titleHref(item);
  const premium = item.accessType === "SUBSCRIPTION";
  const ownImage = promo?.imageUrl ?? null;
  const titleImage = item.coverUrl ?? item.thumbnailUrl ?? item.posterUrl;

  const meta =
    item.type === "BOOK"
      ? [item.author]
      : [
          item.releaseYear ? String(item.releaseYear) : null,
          item.type === "MOVIE" ? formatDuration(item.durationMinutes) : null,
          item.genre,
          item.type === "MOVIE" && item.ageRating && item.ageRating in AGE_RATING_LABELS
            ? AGE_RATING_LABELS[item.ageRating as AgeRating]
            : null,
        ];
  const metaLine = meta.filter(Boolean).join(" · ");

  let primary;
  if (item.type === "BOOK") {
    primary = (
      <Link href={href} className={buttonVariants({ variant: "play", size: "cta", className: "px-[22px]" })}>
        {h.readNow}
      </Link>
    );
  } else if (item.type === "SERIES") {
    primary = (
      <Link href={href} aria-label={h.openSeries(item.title)} className={buttonVariants({ variant: "play", size: "cta", className: "px-[22px]" })}>
        <PlayIcon size={18} />
        {t.browse.play}
      </Link>
    );
  } else if (!premium || isSubscribed) {
    primary = (
      <Link href={`/player/${item.id}`} aria-label={s.play(item.title)} className={buttonVariants({ variant: "play", size: "cta", className: "px-[22px]" })}>
        <PlayIcon size={18} />
        {t.browse.play}
      </Link>
    );
  } else if (isAuthenticated) {
    primary = (
      <Button variant="gold" size="cta" className="px-[22px]" aria-haspopup="dialog" onClick={() => setSubscribeOpen(true)}>
        <CrownIcon size={16} />
        {t.movieDetail.subscribeToWatch}
      </Button>
    );
  } else {
    primary = (
      <Link href={loginHref(pathname)} className={buttonVariants({ variant: "gold", size: "cta", className: "px-[22px]" })}>
        <CrownIcon size={16} />
        {t.movieDetail.subscribeToWatch}
      </Link>
    );
  }

  return (
    <section aria-labelledby="home-spotlight-title" className="px-gutter">
      <h2 id="home-spotlight-title" className="sr-only">
        {h.spotlight}
      </h2>
      <div className="group/card relative block aspect-[21/8] min-h-[360px] overflow-hidden rounded-[12px] bg-surface max-desk:aspect-[4/5] max-desk:min-h-[420px]">
        <div aria-hidden className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]">
          {ownImage ? (
            <PromoVisual preset={promo?.artPreset ?? "GENERIC"} imageUrl={ownImage} sizes="100vw" />
          ) : (
            <Artwork
              src={titleImage}
              seed={item.title}
              variant="hero"
              sizes="100vw"
              zoomOnHover={false}
              className="object-[70%_center]"
            />
          )}
        </div>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(8,8,11,0.88) 0%, rgba(8,8,11,0.5) 38%, rgba(8,8,11,0) 66%)" }}
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: "var(--mq-scrim-card)" }} />
        <Link
          href={href}
          aria-label={h.spotlightLink(kicker, item.title)}
          className="absolute inset-0 z-[1] rounded-[12px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link"
        />
        <div className="pointer-events-none absolute bottom-[clamp(16px,3vw,40px)] left-[clamp(16px,3vw,44px)] z-[2] flex max-w-[560px] flex-col max-desk:right-[clamp(16px,4vw,24px)] max-desk:max-w-none">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm leading-5 font-extrabold text-link">{kicker}</span>
            {premium && <Tag kind="premium">{s.premiumTag}</Tag>}
          </span>
          <span className="mt-3 text-[clamp(28px,2.8vw,40px)] leading-[1.1] font-black tracking-[-0.03em] text-fg transition-colors group-hover/card:text-link">
            {item.title}
          </span>
          {line && (
            <span className="mt-2 line-clamp-2 text-base leading-[25px] text-fg-body">{line}</span>
          )}
          {metaLine && <span className="mt-1.5 text-sm leading-5 text-fg-muted tabular-nums">{metaLine}</span>}
          <span className="pointer-events-auto mt-5 flex flex-wrap items-center gap-3">
            {primary}
            {item.type === "MOVIE" && (
              <Button
                variant="tonal"
                size="cta"
                aria-pressed={isInWatchlist(item.id)}
                onClick={() => toggleWatchlist(item.id)}
                className="px-5 font-bold"
              >
                {isInWatchlist(item.id) ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
                {s.myList}
              </Button>
            )}
          </span>
        </div>
        {source === "PROMO" && (
          <span
            aria-hidden
            className="absolute top-[clamp(16px,2vw,28px)] right-[clamp(16px,3vw,44px)] z-[2] h-7 rounded-full bg-ground/60 px-2.5 text-xs leading-7 font-bold text-fg-muted shadow-[inset_0_0_0_1px_var(--mq-hairline-strong)] max-desk:hidden"
          >
            {h.pickedByTeam}
          </span>
        )}
      </div>
      {isAuthenticated && <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />}
    </section>
  );
}
