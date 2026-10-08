"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { CrownIcon, PeopleIcon } from "@/components/system/icons";
import { FallbackArt } from "@/components/system/FallbackArt";
import { useLanguage } from "@/lib/context/language-context";
import { usePeakUsers } from "@/lib/hooks/use-peak-users";
import { useSection } from "@/lib/i18n/sections/define";
import { authText } from "@/lib/i18n/sections/auth";
import { shellText } from "@/lib/i18n/sections/shell";

/**
 * THE SIGN-IN STAGE (Login / LoginCode / Register / ForgotPassword boards).
 *
 * /login, /register and /forgot-password are the same screen with a
 * different flow inside, so the frame lives here once: a cinematic artwork
 * panel on the left (a tilted wall of posters, the tagline and the
 * peak-viewers figure) that slides up under the shell's minimal glass bar,
 * and a 440px form column on the right sitting straight on the dark ground.
 * Under 720px the panel goes away and the form is the whole page.
 *
 * The shell already draws the bar (logo + language) and leaves out the nav,
 * dock and footer on these routes.
 */
export function AuthLayout({
  children,
  footer,
}: {
  /** The step machine itself (it draws its own step rail and headings). */
  children: ReactNode;
  /** The cross-link to the other auth route ("Don't have an account? Create one"). */
  footer: ReactNode;
}) {
  const a = useSection(authText);

  return (
    <div className="grid min-h-svh grid-cols-1 [margin-top:calc(-1*var(--shell-bar-h))] desk:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <ArtworkPanel />

      <div className="relative flex flex-col items-center justify-center px-gutter pt-[120px] pb-16 max-desk:justify-start max-desk:pt-[calc(var(--shell-bar-h)+32px)]">
        <div className="w-full max-w-[440px]">
          {children}

          <div aria-hidden className="mt-8 h-px bg-hairline" />
          <p className="mt-5 text-[15px] leading-[22px] text-fg-muted">{footer}</p>
          <p className="mt-2.5 text-[13px] leading-[19px] text-fg-faint">
            {a.privacyBefore}
            <Link
              href="/privacy"
              className="mq-link rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {a.privacyLink}
            </Link>
            {a.privacyAfter}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The crimson cross-link under the form ("Create one" / "Sign in"). */
export function AuthCrossLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mq-link rounded-[4px] font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      {children}
    </Link>
  );
}

/**
 * Sample art for the wall — the boards' own catalogue, drawn locally (no
 * network, nothing that can 404 in front of a sign-in form). Purely
 * decorative: the whole wall is hidden from assistive tech.
 * [title, premium crown, NEW tag]
 */
const WALL: ReadonlyArray<readonly [string, boolean, boolean]> = [
  ["The Last Monsoon", true, true],
  ["River of Stars", true, false],
  ["Paper Lanterns", false, true],
  ["Golden Land", true, false],
  ["Night Train to Bagan", false, false],
  ["Under the Pagoda Sky", false, true],
  ["Echoes of Yangon", true, false],
  ["Inle Blue", false, true],
  ["Mandalay Nights", true, false],
  ["Kite Season", false, true],
  ["Rangoon 1948", true, false],
  ["Letters from Mrauk U", true, false],
  ["Thingyan", false, false],
  ["The Ferryman’s Daughter", true, false],
  ["Salt & Smoke", false, false],
  ["Golden Rock", false, false],
  ["Tea Leaf Letters", false, false],
  ["Ruby Valley", true, false],
  ["Caves of Hpa-An", true, true],
  ["Blue Hour Market", false, false],
];
/** Each column's drop, so the wall reads as staggered posters, not a table. */
const COLUMN_OFFSETS = [0, 72, 24, 108, 40];

function ArtworkPanel() {
  const { t } = useLanguage();
  const a = useSection(authText);
  const s = useSection(shellText);
  const peak = usePeakUsers();

  return (
    <aside
      aria-label={a.panelLabel}
      className="relative isolate overflow-hidden bg-[#0E0B14] max-desk:hidden"
    >
      <div
        aria-hidden
        className="mq-settle pointer-events-none absolute top-[-150px] left-[-72px] grid w-[138%] origin-top-left -rotate-[9deg] grid-cols-5 gap-[18px] select-none"
      >
        {COLUMN_OFFSETS.map((offset, column) => (
          <div key={offset} className="flex min-w-0 flex-col gap-[18px]" style={{ marginTop: offset }}>
            {[0, 1, 2, 3].map((row) => {
              const [title, premium, isNew] = WALL[(column * 4 + row * 3) % WALL.length];
              return (
                <span key={row} className="relative block aspect-[2/3] overflow-hidden rounded-[10px]">
                  <FallbackArt seed={title} variant="poster" />
                  <span className="absolute right-3 bottom-3.5 left-3 text-[15px] leading-4 font-black tracking-[-0.02em] text-fg uppercase">
                    {title}
                  </span>
                  {premium && (
                    <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-[6px] bg-art-badge">
                      <CrownIcon size={13} className="text-gold" />
                    </span>
                  )}
                  {isNew && (
                    <span className="absolute top-2.5 left-0 h-5 rounded-r-[4px] bg-crimson px-[7px] text-[10px] leading-5 font-extrabold tracking-[0.06em] text-white [:lang(my)_&]:tracking-normal">
                      {s.newTag}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scrims: under the bar, into the form column, and behind the tagline. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-linear-to-b from-ground/75 to-ground/0" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-linear-to-r from-ground/0 to-ground" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-linear-to-b from-ground/0 from-0% via-ground/86 via-52% to-ground to-100%"
      />

      <div className="mq-rise absolute right-[clamp(48px,6vw,96px)] bottom-[clamp(48px,5vw,80px)] left-[clamp(32px,4vw,56px)] max-w-[580px]">
        <div aria-hidden className="flex flex-wrap gap-2">
          {[t.nav.movies, t.nav.series, t.search.books].map((label) => (
            <span
              key={label}
              className="on-art h-8 rounded-full px-3.5 text-[13px] leading-8 font-bold text-fg"
            >
              {label}
            </span>
          ))}
        </div>
        <p className="mt-5 text-[clamp(40px,4.4vw,64px)] leading-[1.02] font-black tracking-[-0.035em] text-balance text-fg [:lang(my)_&]:leading-[1.3] [:lang(my)_&]:tracking-normal">
          {t.auth.brandTagline}
        </p>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-[27px] text-fg-body [:lang(my)_&]:leading-[30px]">
          {a.panelBody}
        </p>
        {peak !== null && (
          <span className="nums mt-5 flex items-center gap-2 text-[13px] leading-[18px] text-fg-muted">
            <PeopleIcon size={16} className="shrink-0 text-money" />
            {t.nav.peakViewers(peak.toLocaleString("en-US"))}
          </span>
        )}
      </div>
    </aside>
  );
}
