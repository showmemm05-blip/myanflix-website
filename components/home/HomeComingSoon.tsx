"use client";

import Link from "next/link";

import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { loginHref } from "@/lib/auth/return-to";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { mediaText } from "@/lib/i18n/sections/media";
import { PLANS_ANCHOR } from "./HomePremiumBand";
import { PromoVisual } from "./PromoArt";
import { isPromoLive, promoAction, promoText, type ShowcasePromo, type ShowcaseSettings } from "./showcase-model";

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      focusable={false}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

const CARD = "group/card relative flex min-w-0 flex-col overflow-hidden rounded-[12px] bg-surface";
const LINK_OVERLAY =
  "absolute inset-0 z-[1] rounded-[12px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link";

/**
 * COMING SOON (HomeWeb.dc.html §11): the admin's live COMING_SOON promos —
 * picture (upload, the linked title's art, or the preset scene), the date
 * chip only when the admin typed a date, title and line — plus the Games
 * teaser card while it is switched on in the Home settings ("Coming soon",
 * or the admin's date text). No invented dates, no "Notify me" (there is
 * nothing to notify yet). The whole strip hides when it has nothing.
 *
 * A card opens what its button points at: a title's page, a web address
 * (new tab), the Premium band (Subscribe) or Add money; NONE is not a link.
 */
export function HomeComingSoon({ promos, settings }: { promos: ShowcasePromo[]; settings: ShowcaseSettings }) {
  const { language } = useLanguage();
  const h = useSection(homeText);
  const m = useSection(mediaText);
  const { isAuthenticated } = useAuth();

  const live = promos.filter((p) => isPromoLive(p));
  const showGames = settings.gamesTeaserEnabled;
  if (live.length === 0 && !showGames) return null;

  return (
    <section aria-labelledby="home-soon-title" className="px-gutter">
      <h2 id="home-soon-title" className="text-section-title text-fg">
        {m.comingSoonTag}
      </h2>
      <p className="mt-0.5 text-sm leading-5 text-fg-faint">{h.comingSoonSub}</p>
      <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-4 p-0 desk:grid-cols-4">
        {live.map((promo) => {
          const text = promoText(promo, language);
          const action = promoAction(promo);
          const label = h.soonCard(text.title, promo.dateText);
          const picture = promo.imageUrl ?? promo.target?.coverUrl ?? promo.target?.thumbnailUrl ?? promo.target?.posterUrl ?? null;
          let overlay = null;
          if (action?.kind === "external") {
            overlay = (
              <a href={action.href} target="_blank" rel="noopener noreferrer" aria-label={h.opensInNewTab(label)} className={LINK_OVERLAY} />
            );
          } else if (action?.kind === "link") {
            const href = action.needsSignIn && !isAuthenticated ? loginHref(action.href) : action.href;
            overlay = <Link href={href} aria-label={label} className={LINK_OVERLAY} />;
          } else if (action?.kind === "subscribe") {
            overlay = <a href={`#${PLANS_ANCHOR}`} aria-label={label} className={LINK_OVERLAY} />;
          }
          return (
            <li key={promo.id} className={CARD}>
              <span className="relative block aspect-[16/10] overflow-hidden">
                <span aria-hidden className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]">
                  <PromoVisual
                    preset={promo.artPreset}
                    imageUrl={picture}
                    variant="card"
                    sizes="(max-width: 719px) 50vw, 25vw"
                  />
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(8,8,11,0.1) 0%, rgba(8,8,11,0.85) 100%)" }}
                />
                {promo.dateText && (
                  <span className="absolute top-3 left-3 inline-flex h-[26px] max-w-[calc(100%-24px)] items-center gap-1.5 rounded-full bg-art-badge px-2.5 text-xs leading-4 font-extrabold text-fg-body tabular-nums">
                    <CalendarIcon />
                    <span className="truncate">{promo.dateText}</span>
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
                <span className="text-base leading-[22px] font-extrabold text-fg transition-colors group-hover/card:text-link">
                  {text.title}
                </span>
                {(text.body ?? text.kicker) && (
                  <span className="line-clamp-3 text-[13px] leading-[18px] text-fg-muted">{text.body ?? text.kicker}</span>
                )}
              </span>
              {overlay}
            </li>
          );
        })}
        {showGames && (
          <li
            className="relative flex min-w-0 flex-col overflow-hidden rounded-[12px] bg-surface shadow-[inset_0_0_0_1px_rgba(224,24,31,0.28)]"
          >
            <span className="relative block aspect-[16/10] bg-[#15090B]">
              <svg aria-hidden focusable={false} width="100%" height="100%" viewBox="0 0 240 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
                <rect width="240" height="150" fill="#15090B" />
                <circle cx="150" cy="60" r="70" fill="#E0181F" opacity="0.1" />
                <circle cx="150" cy="60" r="34" fill="#E0181F" opacity="0.18" />
                <path
                  d="M86 96 L96 52 Q100 42 112 42 H188 Q200 42 204 52 L214 96 Q216 110 204 110 Q192 110 184 96 L176 84 H124 L116 96 Q108 110 96 110 Q84 110 86 96 Z"
                  fill="#2B1116"
                />
                <path
                  d="M86 96 L96 52 Q100 42 112 42 H188 Q200 42 204 52 L214 96 Q216 110 204 110 Q192 110 184 96 L176 84 H124 L116 96 Q108 110 96 110 Q84 110 86 96 Z"
                  fill="none"
                  stroke="#E0181F"
                  strokeWidth="2"
                  opacity="0.7"
                />
                <path d="M126 58v20M116 68h20" stroke="#F5C451" strokeWidth="3" strokeLinecap="round" />
                <circle cx="176" cy="62" r="3.5" fill="#2FD07E" />
                <circle cx="186" cy="72" r="3.5" fill="#F5C451" />
                <circle cx="166" cy="72" r="3.5" fill="#FF4D55" />
                <circle cx="176" cy="82" r="3.5" fill="#4DB3FF" />
              </svg>
              <span className="absolute top-3 left-3 inline-flex h-[26px] max-w-[calc(100%-24px)] items-center rounded-full bg-crimson/18 px-2.5 text-xs leading-4 font-extrabold text-link tabular-nums">
                <span className="truncate">{settings.gamesTeaserDateText ?? m.comingSoonTag}</span>
              </span>
            </span>
            <span className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
              <span className="text-base leading-[22px] font-extrabold text-fg">{h.games}</span>
              <span className="text-[13px] leading-[18px] text-fg-muted">{h.gamesLine}</span>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
