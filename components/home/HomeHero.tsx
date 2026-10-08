"use client";

import { useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { useTopBarOverHero } from "@/components/layout/shell-context";
import { HeroAnnouncer } from "@/components/media/HeroAnnouncer";
import { isRecent } from "@/components/media/media-data";
import {
  Artwork,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  HeroActions,
  HeroMeta,
  HeroSynopsis,
  HeroTags,
  HeroTitle,
  InfoIcon,
  PlayIcon,
  PlusIcon,
  Rating,
  Tag,
} from "@/components/system";
import { AGE_RATING_LABELS } from "@/components/filters/filter-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatKyat } from "@/lib/currency";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { cn } from "@/lib/utils";
import { PaymentChips, PLANS_ANCHOR } from "./HomePremiumBand";
import { PromoVisual } from "./PromoArt";
import { useHomePlans, type HeroPick } from "./home-data";
import { interleaveHero, planCards, promoAction, promoText, type HeroSlide, type ShowcasePromo } from "./showcase-model";

/** One slide's time on screen before the hero moves on by itself. */
export const HERO_ROTATE_MS = 7000;

const heroPickKey = (pick: HeroPick) => (pick.kind === "movie" ? `movie-${pick.movie.id}` : `series-${pick.series.id}`);
const pickTitle = (pick: HeroPick) => (pick.kind === "movie" ? pick.movie.title : pick.series.title);

/**
 * THE HOME HERO CAROUSEL (HomeWeb.dc.html §1): the five newest published
 * movies and series INTERLEAVED with the admin's live HERO promos — title,
 * promo, title, promo… — full-bleed under the see-through top bar.
 *
 *  - A title slide is the old hero: NEW / FREE / PREMIUM tags, the title,
 *    year · genre · length, two lines of synopsis, then the white Play (or
 *    the gold "Subscribe to watch"), My List for a movie and More info.
 *  - A promo slide draws its preset scene (PREMIUM / PAYMENT / GAMES /
 *    GENERIC) or the uploaded image, then the kicker, title and body the
 *    admin wrote, and its one button: Subscribe opens the Subscribe dialog
 *    (a guest signs in first) with the real plan prices under the copy for
 *    members; Add money opens the deposit dialog (with the payment chips); a
 *    title opens its page; a web address opens in a new tab; NONE has none.
 *
 * It moves on every 7 seconds and pauses while the pointer is over it,
 * focus is inside it, a finger is on it or the Subscribe dialog is open.
 * Desktop: "2 of 6", ‹ › and dots bottom-right (the active dot fills
 * crimson); under 720px a ‹ dots › row sits under the hero. Reduced motion:
 * no auto-advance and a solid active dot — the viewer moves on by hand.
 */
export function HomeHero({ picks, promos }: { picks: HeroPick[]; promos: ShowcasePromo[] }) {
  const { language } = useLanguage();
  const h = useSection(homeText);
  const reduce = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const slides = useMemo(() => interleaveHero(picks, promos, heroPickKey), [picks, promos]);
  const hasSubscribePromo = slides.some((s) => s.kind === "promo" && s.promo.ctaTarget === "SUBSCRIBE");
  const plans = useHomePlans(isAuthenticated && hasSubscribePromo);

  const [index, setIndex] = useState(0);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);

  useTopBarOverHero(true);

  const count = slides.length;
  const safeIndex = count > 0 ? index % count : 0;
  const slide = slides[safeIndex];
  if (!slide) return null;

  const nameOf = (s: HeroSlide<HeroPick>) => (s.kind === "title" ? pickTitle(s.pick) : promoText(s.promo, language).title);
  const go = (next: number) => setIndex(((next % count) + count) % count);
  const paused = subscribeOpen || hovered || focused || held;
  const autoRotate = count > 1 && !reduce;
  const clockKey = `${safeIndex}-${count}`;

  return (
    <>
      <div
        className="contents"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <HeroAnnouncer
          slides={count}
          paused={paused}
          announcement={h.slideName(nameOf(slide), safeIndex + 1, count)}
        >
          <section
            aria-label={h.heroLabel}
            aria-roledescription={count > 1 ? "carousel" : undefined}
            className="group/hero under-bar relative isolate h-[clamp(600px,56vw,820px)] overflow-hidden bg-ground"
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
            onPointerDown={(e) => e.pointerType !== "mouse" && setHeld(true)}
            onPointerUp={() => setHeld(false)}
            onPointerCancel={() => setHeld(false)}
          >
            <div key={`art-${slide.key}`} aria-hidden className="mq-settle absolute inset-0">
              {slide.kind === "title" ? (
                <Artwork
                  src={
                    slide.pick.kind === "movie"
                      ? (slide.pick.movie.coverUrl ?? slide.pick.movie.posterUrl)
                      : (slide.pick.series.coverUrl ?? slide.pick.series.posterUrl)
                  }
                  seed={pickTitle(slide.pick)}
                  variant="hero"
                  sizes="100vw"
                  priority={safeIndex === 0}
                  zoomOnHover={false}
                  className="object-[70%_center]"
                />
              ) : (
                <PromoVisual
                  preset={slide.promo.artPreset}
                  imageUrl={slide.promo.imageUrl}
                  sizes="100vw"
                  priority={safeIndex === 0}
                />
              )}
            </div>
            <div aria-hidden className="absolute inset-0" style={{ background: "var(--mq-scrim-left)" }} />
            <div aria-hidden className="absolute inset-x-0 top-0 h-[220px]" style={{ background: "var(--mq-scrim-top)" }} />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[46%]" style={{ background: "var(--mq-scrim-bottom)" }} />

            <div
              key={`copy-${slide.key}`}
              role="group"
              aria-roledescription="slide"
              aria-label={h.slideName(nameOf(slide), safeIndex + 1, count)}
              className="mq-rise absolute right-[45%] bottom-[clamp(40px,5vw,80px)] left-gutter max-w-[640px] max-desk:right-gutter"
            >
              {slide.kind === "title" ? (
                <TitleSlide pick={slide.pick} onSubscribe={() => setSubscribeOpen(true)} />
              ) : (
                <PromoSlide
                  promo={slide.promo}
                  planLine={
                    slide.promo.ctaTarget === "SUBSCRIBE" ? planLineOf(planCards(plans.data), h) : null
                  }
                  onSubscribe={() => setSubscribeOpen(true)}
                />
              )}
            </div>

            {count > 1 && (
              <div className="absolute right-gutter bottom-[clamp(40px,5vw,80px)] z-[1] flex flex-col items-end gap-3.5 max-desk:hidden">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="mr-1.5 text-sm leading-5 font-bold text-fg-muted tabular-nums">
                    {h.slideCount(safeIndex + 1, count)}
                  </span>
                  <PagerArrow label={h.previousSlide} onClick={() => go(safeIndex - 1)}>
                    <ChevronLeftIcon size={18} strokeWidth={2} />
                  </PagerArrow>
                  <PagerArrow label={h.nextSlide} onClick={() => go(safeIndex + 1)}>
                    <ChevronRightIcon size={18} strokeWidth={2} />
                  </PagerArrow>
                </div>
                <DotTabs
                  labels={slides.map((s, i) => h.slideName(nameOf(s), i + 1, count))}
                  index={safeIndex}
                  onSelect={go}
                  listLabel={h.slides}
                  fill={autoRotate ? { key: clockKey, paused } : null}
                />
              </div>
            )}

            {/* The clock: one invisible bar that fills over 7 s and moves the
                hero on. It always renders (the visible dots hide on phones),
                pauses with the dots, and is left out under reduced motion. */}
            {autoRotate && (
              <span
                key={`clock-${clockKey}`}
                aria-hidden
                className={cn("pointer-events-none absolute top-0 left-0 h-px opacity-0", paused && "[animation-play-state:paused]")}
                style={fillStyle}
                onAnimationEnd={(event) => {
                  // A global reduced-motion rule shortens every animation to
                  // ~0 ms; never let that spin the carousel.
                  if (event.elapsedTime * 1000 < HERO_ROTATE_MS / 2) return;
                  go(safeIndex + 1);
                }}
              />
            )}
          </section>

          {count > 1 && (
            <div className="mt-1 flex h-11 items-center justify-center desk:hidden">
              <button
                type="button"
                aria-label={h.previousSlide}
                onClick={() => go(safeIndex - 1)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-fg-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                <ChevronLeftIcon size={20} strokeWidth={2.2} />
              </button>
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={h.slideName(nameOf(s), i + 1, count)}
                  aria-current={i === safeIndex ? "true" : undefined}
                  onClick={() => go(i)}
                  className="flex h-11 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-[3px] transition-[width] duration-200",
                      i === safeIndex ? "w-[22px] bg-crimson" : "w-1.5 bg-white/30",
                    )}
                  />
                </button>
              ))}
              <button
                type="button"
                aria-label={h.nextSlide}
                onClick={() => go(safeIndex + 1)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-fg-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
              >
                <ChevronRightIcon size={20} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </HeroAnnouncer>
      </div>
      {isAuthenticated && <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />}
    </>
  );
}

/** Longhands, not the `animation` shorthand, so the paused class can win. */
const fillStyle = {
  animationName: "mq-fill",
  animationDuration: `${HERO_ROTATE_MS}ms`,
  animationTimingFunction: "linear",
  animationFillMode: "both",
} as const;

/** "10,000 Ks for 30 days" big, "or 4,000 Ks for 10 days" small — from the real plans, best value first. */
function planLineOf(
  cards: ReturnType<typeof planCards>,
  h: (typeof homeText)["en"],
): { main: string; rest: string | null } | null {
  if (cards.length === 0) return null;
  const ordered = [...cards].sort((a, b) => Number(b.best) - Number(a.best) || b.plan.durationDays - a.plan.durationDays);
  const [first, ...others] = ordered;
  return {
    main: h.planFor(formatKyat(first.plan.price), first.plan.durationDays),
    rest: others.length > 0 ? others.map((c) => h.planOr(formatKyat(c.plan.price), c.plan.durationDays)).join(" · ") : null,
  };
}

function PagerArrow({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal text-fg transition-colors duration-150 outline-none hover:bg-tonal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      {children}
    </button>
  );
}

/** The desktop dots: tabs, ←/→ move between them, the active one fills crimson over 7 s. */
function DotTabs({
  labels,
  index,
  onSelect,
  listLabel,
  fill,
}: {
  labels: string[];
  index: number;
  onSelect: (index: number) => void;
  listLabel: string;
  /** Null under reduced motion (or one slide): the active dot is simply solid. */
  fill: { key: string; paused: boolean } | null;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const count = labels.length;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + count) % count;
    onSelect(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={listLabel} className="flex items-center gap-1.5">
      {labels.map((label, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={onKeyDown}
            className="flex h-6 cursor-pointer items-center border-0 bg-transparent px-0.5 py-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <span
              className={cn(
                "relative block h-1.5 overflow-hidden rounded-[3px] bg-white/30 transition-[width] duration-200",
                active ? "w-7" : "w-1.5",
              )}
            >
              {active &&
                (fill ? (
                  <span
                    key={fill.key}
                    className={cn("absolute inset-y-0 left-0 bg-crimson", fill.paused && "[animation-play-state:paused]")}
                    style={fillStyle}
                  />
                ) : (
                  <span className="absolute inset-0 bg-crimson" />
                ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A featured title (the old hero, unchanged in behaviour). */
function TitleSlide({ pick, onSubscribe }: { pick: HeroPick; onSubscribe: () => void }) {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isInWatchlist, toggleWatchlist } = useLibrary();

  const title = pickTitle(pick);
  const id = pick.kind === "movie" ? pick.movie.id : pick.series.id;
  const createdAt = pick.kind === "movie" ? pick.movie.createdAt : pick.series.createdAt;
  const accessType = pick.kind === "movie" ? pick.movie.accessType : pick.series.accessType;
  const description = pick.kind === "movie" ? pick.movie.description : pick.series.description;
  const premium = accessType === "SUBSCRIPTION";
  const isNew = isRecent(createdAt);

  return (
    <>
      <div>
        <HeroTags>
          {isNew && <Tag kind="new">{s.newTag}</Tag>}
          {premium ? <Tag kind="premium">{s.premiumTag}</Tag> : <Tag kind="free">{s.freeTag}</Tag>}
          <span className="text-sm leading-5 font-semibold text-fg-body">{isNew ? m.recentlyAdded : h.featuredKicker}</span>
        </HeroTags>
        <HeroTitle>{title}</HeroTitle>
        {pick.kind === "movie" ? (
          <HeroMeta>
            {pick.movie.rating > 0 && <Rating value={pick.movie.rating} size="lg" />}
            <span>{pick.movie.releaseYear}</span>
            <span>{pick.movie.genre}</span>
            {formatDuration(pick.movie.duration) && <span>{formatDuration(pick.movie.duration)}</span>}
            {pick.movie.ageRating && <Tag kind="age">{AGE_RATING_LABELS[pick.movie.ageRating]}</Tag>}
          </HeroMeta>
        ) : (
          <HeroMeta>
            {pick.series.rating > 0 && <Rating value={pick.series.rating} size="lg" />}
            <span>{pick.series.releaseYear}</span>
            <span>{pick.series.genre}</span>
            <span>{t.browse.episodeCount(pick.series.episodeCount)}</span>
          </HeroMeta>
        )}
        {description && <HeroSynopsis>{description}</HeroSynopsis>}
      </div>
      <HeroActions>
        {pick.kind === "series" ? (
          <Link href={`/series/${id}`} aria-label={h.openSeries(title)} className={buttonVariants({ variant: "play", size: "hero" })}>
            <PlayIcon size={20} />
            {t.browse.play}
          </Link>
        ) : !premium || isSubscribed ? (
          <Link href={`/player/${id}`} aria-label={s.play(title)} className={buttonVariants({ variant: "play", size: "hero" })}>
            <PlayIcon size={20} />
            {t.browse.play}
          </Link>
        ) : isAuthenticated ? (
          <Button variant="gold" size="hero" className="px-6" aria-haspopup="dialog" onClick={onSubscribe}>
            <CrownIcon size={18} />
            {t.movieDetail.subscribeToWatch}
          </Button>
        ) : (
          <Link href={loginHref(pathname)} className={buttonVariants({ variant: "gold", size: "hero", className: "px-6" })}>
            <CrownIcon size={18} />
            {t.movieDetail.subscribeToWatch}
          </Link>
        )}
        {pick.kind === "movie" && (
          <Button
            variant="tonal"
            size="hero"
            aria-pressed={isInWatchlist(id)}
            onClick={() => toggleWatchlist(id)}
            className="px-[22px] text-base font-bold"
          >
            {isInWatchlist(id) ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
            {s.myList}
          </Button>
        )}
        <Link
          href={pick.kind === "movie" ? `/movie/${id}` : `/series/${id}`}
          aria-label={m.moreAbout(title)}
          className={buttonVariants({ variant: "tonal", size: "icon-hero" })}
        >
          <InfoIcon size={22} />
        </Link>
      </HeroActions>
    </>
  );
}

/** An admin promo: tag, kicker, title, body, the real plan line (Subscribe), one button. */
function PromoSlide({
  promo,
  planLine,
  onSubscribe,
}: {
  promo: ShowcasePromo;
  planLine: { main: string; rest: string | null } | null;
  onSubscribe: () => void;
}) {
  const { language } = useLanguage();
  const h = useSection(homeText);
  const s = useSection(shellText);
  const w = useSection(walletText);
  const m = useSection(mediaText);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();

  const text = promoText(promo, language);
  const action = promoAction(promo);
  const fallbackLabel =
    promo.ctaTarget === "SUBSCRIBE"
      ? h.subscribe
      : promo.ctaTarget === "ADD_MONEY"
        ? w.addMoney
        : promo.target
          ? m.moreAbout(promo.target.title)
          : text.title;
  // Someone who already has Premium is asked to extend it, not to subscribe
  // again (as on the board and in the Premium band) — the admin's own
  // Subscribe label is for everyone else.
  const label =
    promo.ctaTarget === "SUBSCRIBE" && isSubscribed ? h.extendPremium : (text.ctaLabel ?? fallbackLabel);
  const buttonClass = buttonVariants({ variant: "commit", size: "hero", className: "px-[26px]" });

  let button: ReactNode = null;
  if (action?.kind === "subscribe") {
    button = isAuthenticated ? (
      <Button variant="gold" size="hero" className="px-[26px]" aria-haspopup="dialog" onClick={onSubscribe}>
        <CrownIcon size={16} />
        {label}
      </Button>
    ) : (
      <Link href={loginHref(pathname)} className={buttonVariants({ variant: "gold", size: "hero", className: "px-[26px]" })}>
        <CrownIcon size={16} />
        {h.signInToSubscribe}
      </Link>
    );
  } else if (action?.kind === "link") {
    const signInFirst = action.needsSignIn && !isAuthenticated;
    button = (
      <Link href={signInFirst ? loginHref(action.href) : action.href} className={buttonClass}>
        {promo.ctaTarget === "ADD_MONEY" && <PlusIcon size={18} strokeWidth={2} />}
        {signInFirst && promo.ctaTarget === "ADD_MONEY" ? h.signInToAddMoney : label}
      </Link>
    );
  } else if (action?.kind === "external") {
    button = (
      <a href={action.href} target="_blank" rel="noopener noreferrer" aria-label={h.opensInNewTab(label)} className={buttonClass}>
        {label}
      </a>
    );
  }

  return (
    <>
      <HeroTags className="min-h-[22px]">
        {promo.ctaTarget === "SUBSCRIBE" && <Tag kind="premium">{s.premiumTag}</Tag>}
        {promo.ctaTarget === "ADD_MONEY" && <Tag kind="free">{h.walletTag}</Tag>}
        {text.kicker && <span className="text-sm leading-5 font-semibold text-fg-body">{text.kicker}</span>}
      </HeroTags>
      <HeroTitle>{text.title}</HeroTitle>
      {text.body && (
        <p className="mt-3.5 line-clamp-3 max-w-[52ch] text-[17px] leading-[27px] text-fg-body max-desk:text-[15px] max-desk:leading-6">
          {text.body}
        </p>
      )}
      {planLine && isAuthenticated && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[clamp(20px,1.9vw,28px)] leading-9 font-black tracking-[-0.02em] text-gold tabular-nums">
            {planLine.main}
          </span>
          {planLine.rest && <span className="text-[15px] leading-[22px] font-semibold text-fg-muted">{planLine.rest}</span>}
        </p>
      )}
      {(button || promo.ctaTarget === "SUBSCRIBE") && (
        <div className="mt-[22px] flex flex-wrap items-center gap-3">
          {button}
          {promo.ctaTarget === "SUBSCRIBE" && (
            <a href={`#${PLANS_ANCHOR}`} className={buttonVariants({ variant: "tonal", size: "hero", className: "px-[22px] text-base font-bold" })}>
              {h.seePlans}
            </a>
          )}
        </div>
      )}
      {promo.ctaTarget === "ADD_MONEY" && <PaymentChips className="mt-[18px]" />}
    </>
  );
}
