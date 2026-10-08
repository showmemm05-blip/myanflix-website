/**
 * THE HOME SHOWCASE — wire types and the pure rules behind the new Home
 * sections (owner, "build it", 2026-10-08; boards in
 * docs/home-showcase-2026-10-08/design, HomeWeb.dc.html for the website).
 *
 * Everything here is plain TypeScript with no React, Next or "@/…" imports,
 * so `node --test components/home/showcase-model.test.ts` runs it as is.
 *
 * The data comes from GET /api/home/showcase (guest OK; a valid token only
 * adds BOOK links) — the admin's "Home promos" page fills it. A section or
 * card whose data is not set simply does not render: nothing here invents a
 * title, a date, a price or a store link.
 */

export type PromoKind = "HERO" | "SPOTLIGHT" | "COMING_SOON";
export type PromoCtaTarget = "SUBSCRIBE" | "ADD_MONEY" | "MOVIE" | "SERIES" | "BOOK" | "URL" | "NONE";
export type PromoArtPreset = "PREMIUM" | "PAYMENT" | "GAMES" | "GENERIC";
export type ShowcaseTitleType = "MOVIE" | "SERIES" | "BOOK";

/** A linked title, cut down to what the cards draw. Never carries playback fields. */
export interface ShowcaseTitle {
  type: ShowcaseTitleType;
  id: string;
  title: string;
  /** At most 300 characters, whitespace collapsed. */
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  /** Movies only. */
  thumbnailUrl: string | null;
  genre: string | null;
  releaseYear: number | null;
  /** Movies only. */
  durationMinutes: number | null;
  /** 0–10 (0 = not rated yet); null for books. */
  rating: number | null;
  /** Null for books — they have no access type. */
  accessType: "FREE" | "SUBSCRIPTION" | null;
  /** Movies only (G, PG, PG13, R, NC17). */
  ageRating: string | null;
  /** Books only. */
  author: string | null;
}

export interface ShowcasePromo {
  id: string;
  kind: PromoKind;
  titleEn: string;
  titleMm: string;
  kickerEn: string | null;
  kickerMm: string | null;
  bodyEn: string | null;
  bodyMm: string | null;
  ctaLabelEn: string | null;
  ctaLabelMm: string | null;
  ctaTarget: PromoCtaTarget;
  url: string | null;
  artPreset: PromoArtPreset;
  /** Our own upload, already rewritten for the address the page came in on. */
  imageUrl: string | null;
  dateText: string | null;
  startsAt: string | null;
  endsAt: string | null;
  target: ShowcaseTitle | null;
}

export interface ShowcaseSpotlight {
  /** PROMO = the admin's pick; NEWEST_MOVIE = the fallback (promo is null). */
  source: "PROMO" | "NEWEST_MOVIE";
  promo: ShowcasePromo | null;
  title: ShowcaseTitle;
}

export interface ShowcaseSettings {
  webUrl: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  gamesTeaserEnabled: boolean;
  gamesTeaserDateText: string | null;
}

export interface HomeShowcase {
  hero: ShowcasePromo[];
  spotlight: ShowcaseSpotlight | null;
  comingSoon: ShowcasePromo[];
  settings: ShowcaseSettings;
}

/**
 * What Home draws when the call failed or has not come back: nothing set.
 * The games teaser is OFF here (the server's own default is on) — when the
 * settings are unknown, the card is not shown.
 */
export const EMPTY_SHOWCASE: HomeShowcase = {
  hero: [],
  spotlight: null,
  comingSoon: [],
  settings: {
    webUrl: null,
    appStoreUrl: null,
    playStoreUrl: null,
    gamesTeaserEnabled: false,
    gamesTeaserDateText: null,
  },
};

type Lang = "en" | "mm";

/** The promo's words in the active language (the admin must fill both; the other half is only a safety net). */
export function promoText(promo: ShowcasePromo, language: Lang) {
  const pick = (en: string | null, mm: string | null) => {
    const first = language === "mm" ? mm : en;
    const second = language === "mm" ? en : mm;
    const value = (first ?? "").trim() || (second ?? "").trim();
    return value || null;
  };
  return {
    title: pick(promo.titleEn, promo.titleMm) ?? "",
    kicker: pick(promo.kickerEn, promo.kickerMm),
    body: pick(promo.bodyEn, promo.bodyMm),
    ctaLabel: pick(promo.ctaLabelEn, promo.ctaLabelMm),
  };
}

/**
 * Inside its start/end window right now. The server checks the window on
 * every request; the page re-checks because a cached answer may outlive a
 * promo's end time.
 */
export function isPromoLive(promo: Pick<ShowcasePromo, "startsAt" | "endsAt">, now: number = Date.now()): boolean {
  const starts = promo.startsAt ? Date.parse(promo.startsAt) : NaN;
  const ends = promo.endsAt ? Date.parse(promo.endsAt) : NaN;
  if (Number.isFinite(starts) && now < starts) return false;
  if (Number.isFinite(ends) && now >= ends) return false;
  return true;
}

/** One hero slide: a featured title (the five newest) or an admin promo. */
export type HeroSlide<T> = { kind: "title"; key: string; pick: T } | { kind: "promo"; key: string; promo: ShowcasePromo };

/**
 * Title, promo, title, promo… — the featured titles keep their order, the
 * promos keep the admin's order, and whichever list is longer runs on at the
 * end. Promos outside their window are left out.
 */
export function interleaveHero<T>(
  titles: readonly T[],
  promos: readonly ShowcasePromo[],
  titleKey: (pick: T) => string,
  now: number = Date.now(),
): HeroSlide<T>[] {
  const live = promos.filter((p) => isPromoLive(p, now));
  const slides: HeroSlide<T>[] = [];
  const longest = Math.max(titles.length, live.length);
  for (let i = 0; i < longest; i++) {
    const title = titles[i];
    if (title !== undefined) slides.push({ kind: "title", key: `title-${titleKey(title)}`, pick: title });
    const promo = live[i];
    if (promo) slides.push({ kind: "promo", key: `promo-${promo.id}`, promo });
  }
  return slides;
}

/** Only http(s) addresses leave the site; anything else is dropped. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** The page a linked title opens. */
export function titleHref(target: Pick<ShowcaseTitle, "type" | "id">): string {
  if (target.type === "MOVIE") return `/movie/${target.id}`;
  if (target.type === "SERIES") return `/series/${target.id}`;
  return `/books/${target.id}`;
}

/** Where Add money goes: the wallet, with the Deposit dialog open. */
export const DEPOSIT_HREF = "/wallet?deposit=1";

/**
 * What a promo's button does, or null for no button.
 *  - subscribe: the Subscribe dialog (a guest is sent to sign in first)
 *  - link: an in-site page (a guest's Add money goes through sign-in)
 *  - external: an http(s) address, opened in a new tab
 * A title link whose title the viewer cannot see arrives with target null
 * and gets no button.
 */
export type PromoAction =
  | { kind: "subscribe" }
  | { kind: "link"; href: string; needsSignIn: boolean }
  | { kind: "external"; href: string };

export function promoAction(promo: Pick<ShowcasePromo, "ctaTarget" | "url" | "target">): PromoAction | null {
  switch (promo.ctaTarget) {
    case "SUBSCRIBE":
      return { kind: "subscribe" };
    case "ADD_MONEY":
      return { kind: "link", href: DEPOSIT_HREF, needsSignIn: true };
    case "MOVIE":
    case "SERIES":
    case "BOOK":
      return promo.target && promo.target.type === promo.ctaTarget
        ? { kind: "link", href: titleHref(promo.target), needsSignIn: false }
        : null;
    case "URL": {
      const href = safeExternalUrl(promo.url);
      return href ? { kind: "external", href } : null;
    }
    default:
      return null;
  }
}

/** The plan fields the Premium band needs (GET /subscription-plans). */
export interface PlanLike {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  isActive: boolean;
}

export interface PlanCard<P extends PlanLike = PlanLike> {
  plan: P;
  /** Price per day, rounded to the kyat. */
  perDay: number;
  /** True when the price divides evenly into days (no "about"). */
  perDayExact: boolean;
  /** The longest plan, when there is more than one. */
  best: boolean;
}

/**
 * The real plans, side by side: active only (staff accounts also receive
 * inactive ones), shortest first, the longest marked best value.
 */
export function planCards<P extends PlanLike>(plans: readonly P[] | null | undefined): PlanCard<P>[] {
  const active = (plans ?? [])
    .filter((p) => p.isActive && p.durationDays > 0 && p.price >= 0)
    .sort((a, b) => a.durationDays - b.durationDays || a.price - b.price);
  const longest = active.length > 1 ? active[active.length - 1] : null;
  return active.map((plan) => ({
    plan,
    perDay: Math.round(plan.price / plan.durationDays),
    perDayExact: plan.price % plan.durationDays === 0,
    best: longest !== null && plan.id === longest.id,
  }));
}
