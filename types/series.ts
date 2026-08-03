export interface Series {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  language: string;
  releaseYear: number;
  /** One price for the whole show — a single purchase unlocks every season and episode, including future ones. */
  price: number;
  isPremium: boolean;
  categories: { id: string; name: string }[];
  /** Only present on the detail endpoint — whether the caller already owns the show. */
  isPurchased?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesListItem extends Series {
  episodeCount: number;
}

export interface SeasonSummary {
  seasonNumber: number;
  episodeCount: number;
}

export interface SeriesPurchaseEntry {
  id: string;
  seriesId: string;
  seriesTitle: string;
  posterUrl: string | null;
  amount: number;
  createdAt: string;
}
