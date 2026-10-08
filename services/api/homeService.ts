import { apiClient, API_ORIGIN, type RequestSignalOptions } from "./apiClient";
import type { HomeShowcase, ShowcasePromo, ShowcaseTitle } from "@/components/home/showcase-model";

/** Pictures come back absolute; this only covers a relative-path fallback (like bookService does). */
function absolute(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") && !url.startsWith("//") ? `${API_ORIGIN}${url}` : url;
}

function withTitleUrls(title: ShowcaseTitle): ShowcaseTitle {
  return {
    ...title,
    posterUrl: absolute(title.posterUrl),
    coverUrl: absolute(title.coverUrl),
    thumbnailUrl: absolute(title.thumbnailUrl),
  };
}

function withPromoUrls(promo: ShowcasePromo): ShowcasePromo {
  return {
    ...promo,
    imageUrl: absolute(promo.imageUrl),
    target: promo.target ? withTitleUrls(promo.target) : null,
  };
}

export const homeService = {
  /**
   * GET /home/showcase — the admin's Home promos (hero slides, spotlight,
   * coming soon) and the Home settings (store links, games teaser). Open to
   * guests; the stored token is sent when there is one (a signed-in viewer
   * may also get BOOK links), and an expired one is refreshed like any call.
   */
  async getShowcase(options: RequestSignalOptions = {}): Promise<HomeShowcase> {
    const data = await apiClient.get<HomeShowcase>("/home/showcase", options);
    return {
      hero: (data.hero ?? []).map(withPromoUrls),
      spotlight: data.spotlight
        ? {
            ...data.spotlight,
            promo: data.spotlight.promo ? withPromoUrls(data.spotlight.promo) : null,
            title: withTitleUrls(data.spotlight.title),
          }
        : null,
      comingSoon: (data.comingSoon ?? []).map(withPromoUrls),
      settings: data.settings,
    };
  },
};
