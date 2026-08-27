export type BookFormat = "eBook" | "Audiobook";

/**
 * A title in the digital library. Mirrors the shape a future `GET /books`
 * payload is expected to take, so the preview catalog in `lib/media` can be
 * swapped for a service call without touching any component.
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  genre: string;
  format: BookFormat;
  releaseYear: number;
  pages: number;
  /** Longer copy for the featured panel — cards never render it. */
  description: string;
  /** Exactly one book carries the "Book of the week" slot on the Books page. */
  featured?: boolean;
}
