"use client";

import { FallbackArt, HomeIcon, MediaIcon, WalletIcon } from "@/components/system";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { safeExternalUrl, type ShowcaseSettings } from "./showcase-model";

/** Decorative poster seeds for the drawn phone (no real titles, no extra calls). */
const PHONE_POSTERS = ["phone-monsoon", "phone-lanterns", "phone-rain"] as const;

function StoreBadge({ href, small, store }: { href: string; small: string; store: string }) {
  const h = useSection(homeText);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={h.storeLink(store)}
      className="inline-flex h-[52px] items-center gap-2.5 rounded-[12px] bg-ground px-4 text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-opacity duration-150 outline-none hover:opacity-[.88] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
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
      >
        <path d="M12 3v12M8 11l4 4 4-4" />
        <path d="M5 17v2.5h14V17" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold text-fg-muted">{small}</span>
        <span className="mt-[3px] text-[15px] font-extrabold">{store}</span>
      </span>
    </a>
  );
}

/**
 * "WATCH ON YOUR PHONE" (HomeWeb.dc.html §12): the app pitch with a store
 * badge for each store link the admin has set in the Home settings — and
 * only those. With no store link set the whole card stays hidden (no
 * placeholder badges, no QR box). The drawn phone is decoration and hides
 * under 720px.
 */
export function HomePhonePromo({ settings }: { settings: ShowcaseSettings }) {
  const h = useSection(homeText);
  const appStore = safeExternalUrl(settings.appStoreUrl);
  const playStore = safeExternalUrl(settings.playStoreUrl);
  if (!appStore && !playStore) return null;

  return (
    <section aria-labelledby="home-phone-title" className="px-gutter">
      <div className="grid items-center gap-x-[clamp(24px,3vw,48px)] gap-y-6 overflow-hidden rounded-[20px] bg-surface p-[clamp(24px,3vw,44px)] shadow-[inset_0_0_0_1px_var(--mq-hairline)] desk:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
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
              <rect x="7" y="2.5" width="10" height="19" rx="2" />
              <path d="M11 18.5h2" />
            </svg>
            {h.appKicker}
          </p>
          <h2
            id="home-phone-title"
            className="mt-2.5 text-[clamp(26px,2.4vw,34px)] leading-[1.15] font-black tracking-[-0.03em] text-fg"
          >
            {h.phoneTitle}
          </h2>
          <p className="mt-2.5 max-w-[48ch] text-base leading-[25px] text-fg-muted">{h.phoneBody}</p>
          <div className="mt-[22px] flex flex-wrap items-center gap-3">
            {appStore && <StoreBadge href={appStore} small={h.appStoreSmall} store="App Store" />}
            {playStore && <StoreBadge href={playStore} small={h.playStoreSmall} store="Google Play" />}
          </div>
        </div>

        <div aria-hidden className="relative flex min-h-[300px] items-end justify-center max-desk:hidden">
          <div className="relative h-[300px] w-[236px] overflow-hidden rounded-[36px_36px_0_0] bg-ground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_24px_48px_rgba(0,0,0,0.5)]">
            <span className="absolute top-2.5 left-1/2 h-[22px] w-20 -translate-x-1/2 rounded-[11px] bg-raised" />
            <span className="absolute top-12 left-4 flex items-center gap-1.5 text-base font-black tracking-[-0.03em] text-fg">
              <span className="h-4 w-1 rounded-[2px] bg-crimson" />
              MyanFlix
            </span>
            <span className="absolute top-[84px] right-0 left-4 flex gap-2">
              {PHONE_POSTERS.map((seed) => (
                <span key={seed} className="relative aspect-[2/3] w-[84px] shrink-0 overflow-hidden rounded-[8px]">
                  <FallbackArt seed={seed} variant="poster" />
                </span>
              ))}
            </span>
            <span className="absolute right-3 bottom-3.5 left-3 flex h-12 items-center justify-between rounded-3xl bg-[rgba(22,22,28,0.96)] px-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <span className="flex h-[34px] items-center gap-1.5 rounded-[17px] bg-crimson pr-3.5 pl-2.5 text-white">
                <HomeIcon size={16} />
              </span>
              <MediaIcon size={18} className="mr-3.5 text-fg-faint" />
              <WalletIcon size={18} className="mr-3.5 text-fg-faint" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
