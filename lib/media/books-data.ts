import type { Book } from "@/types/book";

/**
 * THE PREVIEW SHELF — a curated catalog shown while the backend has no books
 * API yet (`GET /books` doesn't exist; the old UI showed a bare "coming soon"
 * empty state instead of a Books experience at all).
 *
 * Every title here is original to MyanFlix — nothing implies a licensed real
 * book — and the Books page labels the shelf "coming soon" so the preview
 * never reads as purchasable inventory. Covers use the same picsum fallback
 * host the movie catalog already whitelists in next.config.
 *
 * When the API ships: replace this import with a `bookService` + React Query
 * hook returning the same `Book[]` shape and delete this file.
 */
export const BOOKS: Book[] = [
  {
    id: "book-river-remembers",
    title: "The River Remembers",
    author: "Thiri Aung",
    coverUrl: "https://picsum.photos/seed/mf-book-river/480/672",
    genre: "Historical",
    format: "eBook",
    releaseYear: 2026,
    pages: 384,
    description:
      "Three generations of a ferry family watch their country change from the middle of the Irrawaddy. A sweeping, intimate story of what a river carries away and what it always brings back.",
    featured: true,
  },
  {
    id: "book-bagan-nights",
    title: "Bagan Nights",
    author: "Kyaw Zin Latt",
    coverUrl: "https://picsum.photos/seed/mf-book-bagan/480/672",
    genre: "Romance",
    format: "eBook",
    releaseYear: 2025,
    pages: 312,
    description:
      "A restorer of ancient murals and a hot-air-balloon pilot keep meeting at sunrise — and keep pretending it's a coincidence.",
  },
  {
    id: "book-letters-yangon",
    title: "Letters from Yangon",
    author: "Moe Sandi",
    coverUrl: "https://picsum.photos/seed/mf-book-letters/480/672",
    genre: "Memoir",
    format: "Audiobook",
    releaseYear: 2024,
    pages: 268,
    description:
      "Twenty years of letters home from a journalist who never quite left, read by the author.",
  },
  {
    id: "book-jade-daughter",
    title: "The Jade Merchant's Daughter",
    author: "Hnin Wai",
    coverUrl: "https://picsum.photos/seed/mf-book-jade/480/672",
    genre: "Historical",
    format: "eBook",
    releaseYear: 2025,
    pages: 456,
    description:
      "Mogok, 1938. A daughter learns the family trade — and the family secrets that come set in gold.",
  },
  {
    id: "book-monsoon-season",
    title: "Monsoon Season",
    author: "Aye Chan Myae",
    coverUrl: "https://picsum.photos/seed/mf-book-monsoon/480/672",
    genre: "Poetry",
    format: "eBook",
    releaseYear: 2026,
    pages: 96,
    description: "Sixty poems about rain, waiting, and the particular green of June.",
  },
  {
    id: "book-silent-pagoda",
    title: "The Silent Pagoda",
    author: "Zaw Min Htet",
    coverUrl: "https://picsum.photos/seed/mf-book-pagoda/480/672",
    genre: "Thriller",
    format: "eBook",
    releaseYear: 2025,
    pages: 402,
    description:
      "A night watchman at a temple museum notices one relic has been swapped for a perfect copy. Then he notices he's being watched.",
  },
  {
    id: "book-paper-boats",
    title: "Paper Boats on the Irrawaddy",
    author: "Su Su Hlaing",
    coverUrl: "https://picsum.photos/seed/mf-book-boats/480/672",
    genre: "Fiction",
    format: "Audiobook",
    releaseYear: 2024,
    pages: 288,
    description:
      "Two childhood friends fold their wishes into paper boats every Thadingyut. Thirty years later, one wish comes true.",
  },
  {
    id: "book-vanishing-light",
    title: "A Field Guide to Vanishing Light",
    author: "Nay Lin",
    coverUrl: "https://picsum.photos/seed/mf-book-light/480/672",
    genre: "Fiction",
    format: "eBook",
    releaseYear: 2026,
    pages: 344,
    description:
      "A lighthouse keeper's son catalogs every kind of dusk he has ever seen, looking for the one his father disappeared into.",
  },
  {
    id: "book-tea-shop",
    title: "Tea Shop Conversations",
    author: "Ko Ko Gyi",
    coverUrl: "https://picsum.photos/seed/mf-book-tea/480/672",
    genre: "Essays",
    format: "eBook",
    releaseYear: 2023,
    pages: 224,
    description:
      "Overheard wisdom, terrible advice, and perfect tea — a decade of listening in the country's real parliament.",
  },
  {
    id: "book-weaver-inle",
    title: "The Weaver of Inle",
    author: "Mya Thandar",
    coverUrl: "https://picsum.photos/seed/mf-book-inle/480/672",
    genre: "Fiction",
    format: "eBook",
    releaseYear: 2025,
    pages: 336,
    description:
      "On a lake where houses float, a weaver of lotus silk takes an apprentice who cannot keep a secret.",
  },
  {
    id: "book-stars-mandalay",
    title: "Stars over Mandalay",
    author: "Htoo Aung Kyaw",
    coverUrl: "https://picsum.photos/seed/mf-book-stars/480/672",
    genre: "Romance",
    format: "Audiobook",
    releaseYear: 2024,
    pages: 296,
    description:
      "A planetarium projectionist and an astrology columnist argue about the sky — nightly, then fondly.",
  },
  {
    id: "book-roots-wings",
    title: "Roots and Wings",
    author: "Ei Phyu Phyu",
    coverUrl: "https://picsum.photos/seed/mf-book-roots/480/672",
    genre: "Self-help",
    format: "eBook",
    releaseYear: 2026,
    pages: 208,
    description:
      "On leaving home without losing it — a gentle handbook for anyone living between two places.",
  },
];
