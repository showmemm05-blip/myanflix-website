"use client";

import { Brand } from "@/components/shared/Brand";
import { TMDB_CREDIT_SENTENCE } from "@/lib/credits/tmdb";
import { aboutText } from "@/lib/i18n/sections/about";
import { useSection } from "@/lib/i18n/sections/define";

/**
 * THE ABOUT PAGE (About board, docs/movie-details-tmdb-2026-11-06).
 *
 * A short, calm page in the Privacy page's manner: the MyanFlix lockup and
 * one line saying what the site is, then "Movie information" — the credit
 * TMDB's terms ask for, because staff fill movie and series details from
 * TMDB in the admin.
 *
 *  - The sentence is TMDB's own wording, so it stays in English in both
 *    site languages (`lang="en"`, so a screen reader reads it as English on
 *    the Burmese site too).
 *  - The logo is optional (`tmdbLogoSrc`, null while the file is not in
 *    public/credits): with it, logo then sentence; without it, the sentence
 *    alone, which already names TMDB. Either way the page is complete.
 *  - TMDB asks that their logo be less prominent than our own mark: it is
 *    held inside 96 × 32px, smaller than the lockup above it.
 *
 * The shell adds the top bar, the footer (which links here) and the dock.
 */
export function AboutPage({ tmdbLogoSrc }: { tmdbLogoSrc: string | null }) {
  const a = useSection(aboutText);

  return (
    <div className="px-gutter pt-[clamp(40px,5vw,72px)]">
      <div className="mx-auto max-w-[1120px]">
        <div className="max-w-[720px]">
          <header className="mq-rise">
            <h1>
              {/* The page's name for screen readers; the lockup is the same name drawn. */}
              <span className="sr-only">{a.title}</span>
              <span aria-hidden className="block">
                <Brand size="lg" href={null} />
              </span>
            </h1>
            <p className="mt-4 max-w-[60ch] text-[17px] leading-[27px] text-fg-muted [:lang(my)_&]:leading-[31px]">
              {a.tagline}
            </p>
          </header>

          <section
            aria-labelledby="about-movie-info"
            className="mt-10 pt-10 shadow-[inset_0_1px_0_var(--mq-hairline)]"
          >
            <h2 id="about-movie-info" className="text-section-title text-fg">
              {a.movieInfo}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3.5">
              {tmdbLogoSrc && (
                // Plain <img> on purpose: an SVG from this site's own public
                // folder, whose size is only known once the file is there.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tmdbLogoSrc}
                  alt="TMDB"
                  decoding="async"
                  draggable={false}
                  className="h-auto max-h-8 w-24 shrink-0 object-contain object-left"
                />
              )}
              <p lang="en" className="text-body min-w-[240px] max-w-[68ch] flex-1 text-fg-body">
                {TMDB_CREDIT_SENTENCE}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
