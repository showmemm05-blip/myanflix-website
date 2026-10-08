"use client";

import { useMemo } from "react";

import { ErrorState } from "@/components/empty/ErrorState";
import { RowStack } from "@/components/system";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { mediaText } from "@/lib/i18n/sections/media";
import { HomeBooksBand } from "./HomeBooksBand";
import { HomeComingSoon } from "./HomeComingSoon";
import { HomeHero } from "./HomeHero";
import { HomePhonePromo } from "./HomePhonePromo";
import { HomePremiumBand } from "./HomePremiumBand";
import {
  HOME_SEE_ALL,
  HomeBecauseYouWatched,
  HomeContinueWatching,
  HomeMovieRow,
  HomeSeriesRow,
  HomeSkeleton,
  HomeTop10,
  HomeTopRated,
} from "./HomeRows";
import { HomeSpotlight } from "./HomeSpotlight";
import { HomeValueStrip } from "./HomeValueStrip";
import { heroPicks, ROW_LIMIT, useHomeMovies, useHomeSeries, useHomeShowcase } from "./home-data";
import { EMPTY_SHOWCASE } from "./showcase-model";

/**
 * HOME — the showcase (owner, "build it", 2026-10-08; the board is
 * docs/home-showcase-2026-10-08/design/HomeWeb.dc.html). Top to bottom:
 *
 *    1. Hero carousel — the five newest movies and series INTERLEAVED with
 *       the admin's live HERO promos (7-second rotation).
 *    2. Why MyanFlix — four static, translated value tiles.
 *    3. Continue watching — signed in only, hidden when empty.
 *    4. Spotlight — the admin's SPOTLIGHT pick, else the newest movie.
 *    5. Recently added, New series.
 *    6. Premium band — the real plans (GET /subscription-plans), Subscribe,
 *       Add money, the payment chips.
 *    7. Top 10 most viewed.
 *    8. Read on MyanFlix — the books band (+ the newest books for members).
 *    9. Top rated, Because you watched <title> (signed in only).
 *   10. Coming soon — the admin's COMING_SOON promos + the games teaser.
 *   11. Watch on your phone — only with a store link set.
 *
 * The rows keep their data and rules (one request each, five-minute
 * freshness, nothing asked for hidden rows). The promos, spotlight, coming
 * soon and store links are ONE GET /home/showcase; if it fails, those parts
 * simply do not show and the rest of Home works as before. Any section
 * whose data is not set does not render — nothing is made up.
 *
 * Loading shows the skeleton board until the hero's sources (the two
 * newest rows and the showcase) have all answered, so the first slide is
 * final. When the rows and the showcase all fail with nothing to show, the
 * error state with Retry. The games storefront that used to be here is kept
 * in components/home/arcade for later.
 */
export function HomePage() {
  const { t } = useLanguage();
  const h = useSection(homeText);
  const m = useSection(mediaText);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Recently added + New series (section 5) — the hero's featured titles are cut from them.
  const recent = useHomeMovies("recently-added", { sort: "recentlyAdded", limit: ROW_LIMIT });
  const newSeries = useHomeSeries("recently-added", { sort: "recentlyAdded", limit: ROW_LIMIT });
  const showcaseQuery = useHomeShowcase(isAuthenticated, !authLoading);
  const showcase = showcaseQuery.data ?? EMPTY_SHOWCASE;

  const picks = useMemo(() => heroPicks(recent.data, newSeries.data), [recent.data, newSeries.data]);
  // The hero waits for all three (a failed one counts as settled), so its
  // first slide is final — it never shows titles and then re-sorts a moment
  // later when the promos arrive. The showcase is only asked once the
  // session restore has settled (a disabled query is not "loading"), so the
  // restore counts too — otherwise the page could show, then fall back to
  // the skeleton when the member's showcase request starts.
  const heroLoading = recent.isLoading || newSeries.isLoading || authLoading || showcaseQuery.isLoading;
  const pageFailed =
    recent.isError && newSeries.isError && picks.length === 0 && showcase.hero.length === 0;

  if (pageFailed) {
    return (
      <div className="px-gutter pt-[clamp(96px,10vw,160px)] pb-[120px]">
        <h1 className="sr-only">{t.nav.home}</h1>
        <ErrorState
          title={h.loadHomeFailed}
          description={t.browse.loadFailed}
          onRetry={() => {
            void recent.refetch();
            void newSeries.refetch();
            void showcaseQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (heroLoading) return <HomeSkeleton />;

  const hasHero = picks.length > 0 || showcase.hero.length > 0;

  return (
    <div className="mq-rise pb-4">
      {hasHero ? (
        <HomeHero picks={picks} promos={showcase.hero} />
      ) : (
        <h1 className="px-gutter pt-10 pb-2 text-title text-fg">{t.nav.home}</h1>
      )}

      <HomeValueStrip />

      <RowStack className="mt-[clamp(36px,3.4vw,52px)]">
        <HomeContinueWatching />
        <HomeSpotlight spotlight={showcase.spotlight} />
        <HomeMovieRow
          title={m.recentlyAdded}
          subtitle={m.newReleasesSub}
          movies={recent.data}
          isLoading={recent.isLoading}
          seeAllHref={HOME_SEE_ALL.recentlyAdded}
        />
        <HomeSeriesRow title={h.newSeries} items={newSeries.data} isLoading={newSeries.isLoading} />
        <HomePremiumBand />
        <HomeTop10 />
        <HomeBooksBand />
        <HomeTopRated />
        <HomeBecauseYouWatched />
        <HomeComingSoon promos={showcase.comingSoon} settings={showcase.settings} />
        <HomePhonePromo settings={showcase.settings} />
      </RowStack>
    </div>
  );
}
