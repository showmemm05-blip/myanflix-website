/**
 * Music catalog shapes. Like `types/book.ts`, these mirror the payloads a
 * future `GET /music/*` API is expected to return, so the preview data in
 * `lib/media` can become service calls without component changes.
 */
export interface MusicAlbum {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  releaseYear: number;
  trackCount: number;
  genre: string;
  /** Exactly one album carries the "Album spotlight" slot on the All page. */
  featured?: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  durationSeconds: number;
}
