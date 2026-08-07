import type { AccessType } from "./movie";

export interface Series {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  language: string;
  releaseYear: number;
  /** One access type for the whole show — governs every season and episode, including future ones. */
  accessType: AccessType;
  categories: { id: string; name: string }[];
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

/** The caller's own watch progress for one episode — null when never started. */
export interface PlayerEpisodeProgress {
  progressPercent: number;
  lastPositionSeconds: number;
}

/** An episode as shown in the player page's Episodes section — a lighter shape than the full `Movie`, since this list doesn't need categories/pricing/etc. */
export interface PlayerEpisode {
  id: string;
  title: string;
  episodeNumber: number | null;
  /** Minutes, same unit as `Movie.duration`. */
  duration: number;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  watchProgress: PlayerEpisodeProgress | null;
}

export interface PlayerSeasonGroup {
  seasonNumber: number;
  episodes: PlayerEpisode[];
}

export interface PlayerEpisodesResponse {
  seasons: PlayerSeasonGroup[];
}
