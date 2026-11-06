import { defineSection } from "./define";

/**
 * The movie / series TYPE the admin picks (owner, 2026-10-27: "English
 * movies, Korean movies…"). The API sends the plain word as `country`
 * ("Korean"); these are its names and the phrases built around one. The
 * admin's list is admin/lib/constants/movie-options.ts MEDIA_TYPES.
 */
export const mediaTypeText = defineSection({
  en: {
    names: {
      English: "English",
      Korean: "Korean",
      Chinese: "Chinese",
      Thai: "Thai",
      Japanese: "Japanese",
      Indian: "Indian",
      Myanmar: "Myanmar",
      Other: "Other",
    },
    /** "Korean movie" — the movie page's hero line and details. */
    movie: (name: string) => `${name} movie`,
    /** "Korean series" — the series page's hero line and details. */
    series: (name: string) => `${name} series`,
    /** "Korean movies" — an applied filter's pill. */
    movies: (name: string) => `${name} movies`,
    /** The details row and the filter group. */
    label: "Type",
    filterLabel: "Movie type",
  },
  mm: {
    names: {
      English: "အင်္ဂလိပ်",
      Korean: "ကိုရီးယား",
      Chinese: "တရုတ်",
      Thai: "ထိုင်း",
      Japanese: "ဂျပန်",
      Indian: "အိန္ဒိယ",
      Myanmar: "မြန်မာ",
      Other: "အခြား",
    },
    movie: (name: string) => `${name} ရုပ်ရှင်`,
    series: (name: string) => `${name} ဇာတ်လမ်းတွဲ`,
    movies: (name: string) => `${name} ရုပ်ရှင်များ`,
    label: "အမျိုးအစား",
    filterLabel: "ရုပ်ရှင်အမျိုးအစား",
  },
});

type MediaTypeText = (typeof mediaTypeText)["en"];

/** A type word in the viewer's language; a word this site does not know yet shows as itself. */
export function mediaTypeName(m: MediaTypeText, word: string): string {
  return (m.names as Record<string, string>)[word] ?? word;
}

/**
 * "Korean movie" / "Korean series" for a title page, or null when there is
 * nothing worth saying: no type, or "Other".
 */
export function mediaTypeLabel(
  m: MediaTypeText,
  word: string | null | undefined,
  kind: "movie" | "series",
): string | null {
  const trimmed = word?.trim();
  if (!trimmed || trimmed === "Other") return null;
  return m[kind](mediaTypeName(m, trimmed));
}
