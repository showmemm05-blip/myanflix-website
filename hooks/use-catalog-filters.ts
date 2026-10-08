"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BROWSE_TABS, type BrowseTab } from "@/components/browse/BrowseBar";
import {
  AGE_RATING_LABELS,
  DEFAULT_FILTERS,
  DEFAULT_MOVIE_SORT,
  DEFAULT_SERIES_FILTERS,
  DEFAULT_SERIES_SORT,
  countActiveFilters,
  countActiveSeriesFilters,
  type ActorSelection,
  type FilterState,
  type SeriesFilterState,
} from "@/components/filters/filter-types";
import type { ActivePill } from "@/components/browse/ActiveFilterPills";
import type { GridDensity } from "@/components/browse/PosterGrid";
import { actorService } from "@/services/api/actorService";
import { useSearchTerm } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import type { AccessType, AgeRating, MovieQuery, MovieSortOption } from "@/types/movie";
import type { SeriesQuery, SeriesSortOption } from "@/types/series";

/**
 * v2 because the shape changed wholesale (multi-value facets, ranges, actor
 * {id,name} pairs) — the old single-value key is deleted on first load rather
 * than migrated: filters are a preference, not data.
 */
const PREFS_STORAGE_KEY = "myanflix-catalog-filters-v2";
const LEGACY_PREFS_STORAGE_KEY = "myanflix-movies-filters";

const MOVIE_SORTS: MovieSortOption[] = [
  "relevance",
  "recentlyAdded",
  "newest",
  "oldest",
  "rating",
  "title",
  "mostViewed",
  "mostPurchased",
];
const SERIES_SORTS: SeriesSortOption[] = [
  "relevance",
  "recentlyAdded",
  "newest",
  "oldest",
  "title",
];
const AGE_RATINGS = Object.keys(AGE_RATING_LABELS) as AgeRating[];

/** Any of these in the URL means "this link carries filters" — the URL then wins over localStorage entirely. */
const FILTER_PARAM_KEYS = [
  "sort",
  "genre", // legacy read-only alias -> genres
  "genres",
  "languages",
  "actorIds",
  "directors",
  "countries",
  "ageRatings",
  "yearFrom",
  "yearTo",
  "ratingMin",
  "ratingMax",
  "durationMin",
  "durationMax",
  "access",
] as const;

// ── Input limits ───────────────────────────────────────────────────────
// These mirror what the API's query DTOs accept (backend movie-query.dto.ts /
// series-query.dto.ts). Filters arrive from two places we do not control — a
// shared link and this browser's saved preferences — and anything the server
// would answer 400 to must be dropped HERE, or the grid sits on "couldn't
// load" with a Retry that can never succeed (and the saved copy brings the
// same bad value back on the next visit). Everything the UI itself can pick is
// well inside these limits, so a real user never hits them.
/** @ArrayMaxSize(20) on every facet list. */
const MAX_LIST_ENTRIES = 20;
/** @MaxLength(64, { each: true }) on genres / languages / countries / ageRatings. */
const MAX_FACET_LENGTH = 64;
/** @MaxLength(120, { each: true }) on directors. */
const MAX_DIRECTOR_LENGTH = 120;
/** @MaxLength(200) on `search`. */
const MAX_SEARCH_LENGTH = 200;
/** Resolved one request each on a deep link — kept to the historic cap. */
const MAX_ACTORS = 10;
/** actorIds are @IsUUID('4') server-side; anything else is a guaranteed 400. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A facet list from anywhere: trimmed strings only, over-long entries dropped
 * (they can't match a real facet value anyway), de-duplicated, capped at the
 * API's list size. Non-list input (a tampered prefs blob) is simply empty.
 */
function cleanList(value: unknown, maxLength = MAX_FACET_LENGTH): string[] {
  if (!Array.isArray(value)) return [];
  const out = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const s = entry.trim();
    if (s.length === 0 || s.length > maxLength) continue;
    out.add(s);
    if (out.size >= MAX_LIST_ENTRIES) break;
  }
  return [...out];
}

function parseCsv(value: string | null, maxLength = MAX_FACET_LENGTH): string[] {
  if (!value) return [];
  return cleanList(value.split(","), maxLength);
}

/**
 * A numeric bound from a URL string or a stored value. `integer` mirrors the
 * API's @IsInt (years, minutes): `2000.5` is out, not rounded, so the link
 * and the saved copy stay honest about what was asked for.
 */
function parseNum(value: unknown, lo: number, hi: number, integer: boolean): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < lo || n > hi) return undefined;
  if (integer && !Number.isInteger(n)) return undefined;
  return n;
}

function parseAccess(value: unknown): AccessType | undefined {
  return value === "FREE" || value === "SUBSCRIPTION" ? value : undefined;
}

function parseSort<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseAgeRatings(value: unknown): AgeRating[] {
  return cleanList(value).filter((v): v is AgeRating => AGE_RATINGS.includes(v as AgeRating));
}

/** {id, name} pairs: only well-formed v4 ids survive (the API rejects any other), at most MAX_ACTORS. */
function cleanActors(value: unknown): ActorSelection[] {
  if (!Array.isArray(value)) return [];
  const out: ActorSelection[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const { id, name } = entry;
    if (typeof id !== "string" || !UUID_V4.test(id) || typeof name !== "string") continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: name.slice(0, MAX_DIRECTOR_LENGTH) });
    if (out.length >= MAX_ACTORS) break;
  }
  return out;
}

/**
 * THE one place an untrusted movie-filter shape becomes a valid FilterState.
 * Both the URL parser and the localStorage restore feed through here, so the
 * API limits above are enforced identically whichever way a value arrived.
 */
function sanitizeMovieFilters(raw: unknown): FilterState {
  const f = isRecord(raw) ? raw : {};
  return {
    sort: parseSort(f.sort, MOVIE_SORTS, DEFAULT_MOVIE_SORT),
    genres: cleanList(f.genres),
    languages: cleanList(f.languages),
    actors: cleanActors(f.actors),
    directors: cleanList(f.directors, MAX_DIRECTOR_LENGTH),
    countries: cleanList(f.countries),
    ageRatings: parseAgeRatings(f.ageRatings),
    yearFrom: parseNum(f.yearFrom, 1888, 2100, true),
    yearTo: parseNum(f.yearTo, 1888, 2100, true),
    ratingMin: parseNum(f.ratingMin, 0, 10, false),
    ratingMax: parseNum(f.ratingMax, 0, 10, false),
    durationMin: parseNum(f.durationMin, 0, 6000, true),
    durationMax: parseNum(f.durationMax, 0, 6000, true),
    accessType: parseAccess(f.accessType),
  };
}

function sanitizeSeriesFilters(raw: unknown): SeriesFilterState {
  const f = isRecord(raw) ? raw : {};
  return {
    sort: parseSort(f.sort, SERIES_SORTS, DEFAULT_SERIES_SORT),
    genres: cleanList(f.genres),
    languages: cleanList(f.languages),
    yearFrom: parseNum(f.yearFrom, 1888, 2100, true),
    yearTo: parseNum(f.yearTo, 1888, 2100, true),
    accessType: parseAccess(f.accessType),
  };
}

/** The search term as the API's @MaxLength(200) allows it; anything else is not a string. */
function sanitizeSearch(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_SEARCH_LENGTH) : "";
}

function parseMovieFilters(params: URLSearchParams): FilterState {
  return sanitizeMovieFilters({
    sort: params.get("sort"),
    // ?genre= is the legacy single-genre deep link — read forever, folded in.
    genres: [...parseCsv(params.get("genres")), ...parseCsv(params.get("genre"))],
    languages: parseCsv(params.get("languages")),
    // A URL-only link carries ids alone; the id doubles as a provisional name
    // until resolveActorNames swaps the real one in.
    actors: parseCsv(params.get("actorIds")).map((id): ActorSelection => ({ id, name: id })),
    directors: parseCsv(params.get("directors"), MAX_DIRECTOR_LENGTH),
    countries: parseCsv(params.get("countries")),
    ageRatings: parseCsv(params.get("ageRatings")),
    yearFrom: params.get("yearFrom"),
    yearTo: params.get("yearTo"),
    ratingMin: params.get("ratingMin"),
    ratingMax: params.get("ratingMax"),
    durationMin: params.get("durationMin"),
    durationMax: params.get("durationMax"),
    accessType: params.get("access"),
  });
}

function parseSeriesFilters(params: URLSearchParams): SeriesFilterState {
  return sanitizeSeriesFilters({
    sort: params.get("sort"),
    genres: [...parseCsv(params.get("genres")), ...parseCsv(params.get("genre"))],
    languages: parseCsv(params.get("languages")),
    yearFrom: params.get("yearFrom"),
    yearTo: params.get("yearTo"),
    accessType: params.get("access"),
  });
}

/**
 * Test seam (no React needed): the pure parsers, under one name so the hook's
 * public surface stays the hook. Not for use by components.
 */
export const catalogFilterParsers = {
  parseMovieFilters,
  parseSeriesFilters,
  sanitizeMovieFilters,
  sanitizeSeriesFilters,
  sanitizeSearch,
};

interface StoredPrefs {
  filters?: Partial<FilterState>;
  seriesFilters?: Partial<SeriesFilterState>;
  search?: string;
  density?: GridDensity;
}

/**
 * THE one owner of catalog filter state — for both the /search surface and
 * the /media/movies catalog. Canonical FilterState, mount-time init where an
 * explicit URL param wins over localStorage, URL writeback (router.replace,
 * once per settled change), localStorage persistence, active counts, clear
 * all, and the pills row — nothing else re-implements any of this.
 */
export function useCatalogFilters(mode: "media" | "search") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const allowedTabs: BrowseTab[] = useMemo(
    () => (mode === "media" ? ["movies", "series"] : BROWSE_TABS),
    [mode],
  );

  const [tab, setTab] = useState<BrowseTab>(() => {
    const fromUrl = searchParams.get("tab");
    if (allowedTabs.includes(fromUrl as BrowseTab)) return fromUrl as BrowseTab;
    // ?type=series is the old /media/movies deep-link spelling — read forever.
    if (searchParams.get("type") === "series") return "series";
    return "movies";
  });

  const urlHasFilters = useMemo(
    () => FILTER_PARAM_KEYS.some((key) => searchParams.get(key) !== null),
    // Mount-time decision on purpose — see the storage-restore effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [rawFilters, setFilters] = useState<FilterState>(() =>
    urlHasFilters ? parseMovieFilters(new URLSearchParams(searchParams)) : DEFAULT_FILTERS,
  );
  const [rawSeriesFilters, setSeriesFilters] = useState<SeriesFilterState>(() =>
    urlHasFilters
      ? parseSeriesFilters(new URLSearchParams(searchParams))
      : DEFAULT_SERIES_FILTERS,
  );

  /**
   * All of the search's timing lives in `use-search-term`: `search` follows
   * the keyboard, `effectiveTerm` is what actually goes out — debounced,
   * trimmed, and empty until it's long enough to be worth a request.
   */
  const {
    term: search,
    setTerm,
    effectiveTerm,
    isDebouncing,
    isTooShort,
    clear: clearSearch,
  } = useSearchTerm(sanitizeSearch(searchParams.get("q")));
  // The field is held to the API's limit the same way a link or a saved term
  // is: a term typed or pasted past 200 characters would otherwise go out as
  // typed and come back as a 400. The input is controlled by `search`, so
  // this behaves like a maxLength on the box.
  const setSearch = useCallback((value: string) => setTerm(sanitizeSearch(value)), [setTerm]);

  const [density, setDensity] = useState<GridDensity>("comfortable");
  const [hydrated, setHydrated] = useState(false);

  // Restore the user's last filters/search once on mount. A link that carries
  // its own filter params is someone SHARING a view — storage must not edit
  // what they were sent, so the whole restore is skipped for filters then.
  useEffect(() => {
    // The pre-v2 key stored a different shape (single-value genre/language,
    // minRating) — delete rather than migrate.
    localStorage.removeItem(LEGACY_PREFS_STORAGE_KEY);
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredPrefs;
        // Storage is this browser's own, but it is still untrusted input: a
        // crafted link once saved here would otherwise come back on every
        // visit — so the restore runs the same sanitiser as the URL.
        if (!urlHasFilters) {
          if (parsed.filters) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFilters(sanitizeMovieFilters(parsed.filters));
          }
          if (parsed.seriesFilters) {
            setSeriesFilters(sanitizeSeriesFilters(parsed.seriesFilters));
          }
        }
        if (typeof parsed.search === "string" && !searchParams.get("q")) {
          setSearch(parsed.search); // setSearch applies the 200-char limit
        }
        if (parsed.density === "compact" || parsed.density === "comfortable") {
          setDensity(parsed.density);
        }
      } catch {
        // Malformed storage — fall back to defaults already in state.
      }
    }
    setHydrated(true);
    // Deliberately mount-only: re-running this on searchParams changes would
    // fight the user's own subsequent filter/search edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A URL-only deep link knows actors by id alone; the pills need names.
  // Resolved once, in parallel, capped at 10 by the parse; a 404 (deleted
  // actor) silently drops that selection rather than erroring the page.
  const actorsResolved = useRef(false);
  /** The last URL this hook wrote — a second identical write in the same tick is skipped. */
  const lastWrittenUrl = useRef<string | null>(null);
  useEffect(() => {
    if (actorsResolved.current) return;
    const unresolved = rawFilters.actors.filter((a) => a.name === a.id);
    if (unresolved.length === 0) return;
    actorsResolved.current = true;
    void Promise.all(unresolved.map((a) => actorService.getActor(a.id))).then((resolved) => {
      const names = new Map(
        resolved.filter((a): a is NonNullable<typeof a> => a !== null).map((a) => [a.id, a.name]),
      );
      setFilters((prev) => ({
        ...prev,
        actors: prev.actors
          .map((a) => (a.name === a.id ? { id: a.id, name: names.get(a.id) ?? "" } : a))
          .filter((a) => a.name !== ""),
      }));
    });
  }, [rawFilters.actors]);

  // Relevance is only meaningful against a search term — without one the
  // server falls back to recentlyAdded, so the DERIVED state says the same
  // thing rather than silently disagreeing with what the list actually shows.
  // (Raw state keeps the choice, so re-typing a term restores it.)
  const filters = useMemo<FilterState>(
    () =>
      rawFilters.sort === "relevance" && !effectiveTerm
        ? { ...rawFilters, sort: DEFAULT_MOVIE_SORT }
        : rawFilters,
    [rawFilters, effectiveTerm],
  );
  const seriesFilters = useMemo<SeriesFilterState>(
    () =>
      rawSeriesFilters.sort === "relevance" && !effectiveTerm
        ? { ...rawSeriesFilters, sort: DEFAULT_SERIES_SORT }
        : rawSeriesFilters,
    [rawSeriesFilters, effectiveTerm],
  );

  // Persist once hydrated — keyed on the SETTLED term so a keystroke never
  // writes half a word as the query to restore.
  useEffect(() => {
    if (!hydrated) return;
    const prefs: StoredPrefs = { filters, seriesFilters, search: effectiveTerm, density };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  }, [hydrated, filters, seriesFilters, effectiveTerm, density]);

  // ── URL writeback ──────────────────────────────────────────────────────
  // The address bar always spells the current view so it can be shared: tab,
  // settled term, and the visible tab's filters (CSV arrays, defaults
  // omitted). Written back to whichever route is showing the surface.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (effectiveTerm) params.set("q", effectiveTerm);

    const setCsv = (key: string, values: string[]) => {
      if (values.length > 0) params.set(key, values.join(","));
    };
    const setNum = (key: string, value: number | undefined) => {
      if (value !== undefined) params.set(key, String(value));
    };

    if (tab === "movies") {
      if (filters.sort !== DEFAULT_MOVIE_SORT) params.set("sort", filters.sort);
      setCsv("genres", filters.genres);
      setCsv("languages", filters.languages);
      setCsv("actorIds", filters.actors.map((a) => a.id));
      setCsv("directors", filters.directors);
      setCsv("countries", filters.countries);
      setCsv("ageRatings", filters.ageRatings);
      setNum("yearFrom", filters.yearFrom);
      setNum("yearTo", filters.yearTo);
      setNum("ratingMin", filters.ratingMin);
      setNum("ratingMax", filters.ratingMax);
      setNum("durationMin", filters.durationMin);
      setNum("durationMax", filters.durationMax);
      if (filters.accessType) params.set("access", filters.accessType);
    } else if (tab === "series") {
      if (seriesFilters.sort !== DEFAULT_SERIES_SORT) params.set("sort", seriesFilters.sort);
      setCsv("genres", seriesFilters.genres);
      setCsv("languages", seriesFilters.languages);
      setNum("yearFrom", seriesFilters.yearFrom);
      setNum("yearTo", seriesFilters.yearTo);
      if (seriesFilters.accessType) params.set("access", seriesFilters.accessType);
    }

    // Parameters this hook does not own (e.g. `categories`, which opens the
    // Categories overlay and selects the Categories chip) are carried over
    // untouched, so this rewrite never drops another feature's state. `type`
    // is the legacy spelling of `tab` and is owned (replaced by `tab`).
    const owned = new Set<string>(["tab", "q", "type", ...FILTER_PARAM_KEYS]);
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (!owned.has(key) && !params.has(key)) params.append(key, value);
    });

    // Idempotent on purpose. A mount that restores saved preferences changes
    // filters, series filters and the term in quick succession, and each one
    // re-runs this effect with the SAME resulting URL. Replacing the current
    // URL with itself several times within one commit tipped Next.js into its
    // hard-navigation fallback — a full reload, which restored preferences
    // again, and looped. So: build the URL, and only write it when it differs
    // from what the address bar already says.
    const next = `${pathname}?${params.toString()}`;
    const currentParams = new URLSearchParams(window.location.search);
    const current = `${window.location.pathname}?${currentParams.toString()}`;
    if (next === current || next === lastWrittenUrl.current) return;
    lastWrittenUrl.current = next;
    router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effectiveTerm, filters, seriesFilters, pathname]);

  // ── Derived state ──────────────────────────────────────────────────────

  const updateFilters = useCallback((next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);
  const updateSeriesFilters = useCallback((next: Partial<SeriesFilterState>) => {
    setSeriesFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const isMoviesTab = tab === "movies";

  const clearAll = useCallback(() => {
    if (isMoviesTab) setFilters(DEFAULT_FILTERS);
    else setSeriesFilters(DEFAULT_SERIES_FILTERS);
  }, [isMoviesTab]);

  const movieActiveCount = countActiveFilters(filters);
  const seriesActiveCount = countActiveSeriesFilters(seriesFilters);
  const activeCount = isMoviesTab ? movieActiveCount : seriesActiveCount;

  const sortLabels: Record<MovieSortOption, string> = useMemo(
    () => ({
      relevance: t.filters.sortRelevance,
      recentlyAdded: t.filters.sortRecentlyAdded,
      newest: t.filters.sortNewest,
      oldest: t.filters.sortOldest,
      rating: t.filters.sortRating,
      title: t.filters.sortTitle,
      mostViewed: t.filters.sortMostViewed,
      mostPurchased: t.filters.sortMostPurchased,
    }),
    [t],
  );

  const searchActive = Boolean(effectiveTerm);

  // Built ONCE for both the bar's sort select and the sheet's sort chips —
  // relevance is offered only while a term is active (without one the server
  // would silently sort by recentlyAdded, and the option would be a lie).
  const movieSortOptions = useMemo(
    () =>
      MOVIE_SORTS.filter((s) => s !== "relevance" || searchActive).map((value) => ({
        value,
        label: sortLabels[value],
      })),
    [sortLabels, searchActive],
  );
  const seriesSortOptions = useMemo(
    () =>
      SERIES_SORTS.filter((s) => s !== "relevance" || searchActive).map((value) => ({
        value,
        label: sortLabels[value],
      })),
    [sortLabels, searchActive],
  );

  // One pill per active VALUE, each removable in place; sort earns a pill
  // only when it isn't the default.
  const pills: ActivePill[] = useMemo(() => {
    const out: ActivePill[] = [];
    const accessLabel = (access: AccessType) =>
      access === "FREE" ? t.search.accessFree : t.search.accessSubscription;

    if (isMoviesTab) {
      for (const genre of filters.genres) {
        out.push({
          key: `genre:${genre}`,
          label: genre,
          onRemove: () =>
            setFilters((p) => ({ ...p, genres: p.genres.filter((g) => g !== genre) })),
        });
      }
      for (const language of filters.languages) {
        out.push({
          key: `language:${language}`,
          label: language,
          onRemove: () =>
            setFilters((p) => ({ ...p, languages: p.languages.filter((l) => l !== language) })),
        });
      }
      for (const actor of filters.actors) {
        out.push({
          key: `actor:${actor.id}`,
          label: actor.name,
          onRemove: () =>
            setFilters((p) => ({ ...p, actors: p.actors.filter((a) => a.id !== actor.id) })),
        });
      }
      for (const director of filters.directors) {
        out.push({
          key: `director:${director}`,
          label: director,
          onRemove: () =>
            setFilters((p) => ({ ...p, directors: p.directors.filter((d) => d !== director) })),
        });
      }
      for (const country of filters.countries) {
        out.push({
          key: `country:${country}`,
          label: country,
          onRemove: () =>
            setFilters((p) => ({ ...p, countries: p.countries.filter((c) => c !== country) })),
        });
      }
      for (const rating of filters.ageRatings) {
        out.push({
          key: `ageRating:${rating}`,
          label: AGE_RATING_LABELS[rating],
          onRemove: () =>
            setFilters((p) => ({ ...p, ageRatings: p.ageRatings.filter((r) => r !== rating) })),
        });
      }
      if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
        out.push({
          key: "years",
          label: rangeLabel(filters.yearFrom, filters.yearTo),
          onRemove: () => setFilters((p) => ({ ...p, yearFrom: undefined, yearTo: undefined })),
        });
      }
      if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
        out.push({
          key: "rating",
          label: `${rangeLabel(filters.ratingMin, filters.ratingMax)} ★`,
          onRemove: () => setFilters((p) => ({ ...p, ratingMin: undefined, ratingMax: undefined })),
        });
      }
      if (filters.durationMin !== undefined || filters.durationMax !== undefined) {
        out.push({
          key: "duration",
          label: durationPillLabel(filters.durationMin, filters.durationMax, t),
          onRemove: () =>
            setFilters((p) => ({ ...p, durationMin: undefined, durationMax: undefined })),
        });
      }
      if (filters.accessType) {
        out.push({
          key: "access",
          label: accessLabel(filters.accessType),
          onRemove: () => setFilters((p) => ({ ...p, accessType: undefined })),
        });
      }
      if (filters.sort !== DEFAULT_MOVIE_SORT) {
        out.push({
          key: "sort",
          label: sortLabels[filters.sort],
          onRemove: () => setFilters((p) => ({ ...p, sort: DEFAULT_MOVIE_SORT })),
        });
      }
      return out;
    }

    for (const genre of seriesFilters.genres) {
      out.push({
        key: `genre:${genre}`,
        label: genre,
        onRemove: () =>
          setSeriesFilters((p) => ({ ...p, genres: p.genres.filter((g) => g !== genre) })),
      });
    }
    for (const language of seriesFilters.languages) {
      out.push({
        key: `language:${language}`,
        label: language,
        onRemove: () =>
          setSeriesFilters((p) => ({ ...p, languages: p.languages.filter((l) => l !== language) })),
      });
    }
    if (seriesFilters.yearFrom !== undefined || seriesFilters.yearTo !== undefined) {
      out.push({
        key: "years",
        label: rangeLabel(seriesFilters.yearFrom, seriesFilters.yearTo),
        onRemove: () =>
          setSeriesFilters((p) => ({ ...p, yearFrom: undefined, yearTo: undefined })),
      });
    }
    if (seriesFilters.accessType) {
      out.push({
        key: "access",
        label: accessLabel(seriesFilters.accessType),
        onRemove: () => setSeriesFilters((p) => ({ ...p, accessType: undefined })),
      });
    }
    if (seriesFilters.sort !== DEFAULT_SERIES_SORT) {
      out.push({
        key: "sort",
        label: sortLabels[seriesFilters.sort],
        onRemove: () => setSeriesFilters((p) => ({ ...p, sort: DEFAULT_SERIES_SORT })),
      });
    }
    return out;
  }, [isMoviesTab, filters, seriesFilters, sortLabels, t]);

  // The canonical queries the infinite hooks consume. `search` is only keyed
  // in for the tab that renders the query, and only past the minimum length —
  // the query then stays the plain catalogue read rather than being disabled.
  const movieQuery: MovieQuery = useMemo(
    () => ({
      search: isMoviesTab ? effectiveTerm || undefined : undefined,
      genres: filters.genres.length > 0 ? filters.genres : undefined,
      languages: filters.languages.length > 0 ? filters.languages : undefined,
      actorIds: filters.actors.length > 0 ? filters.actors.map((a) => a.id) : undefined,
      directors: filters.directors.length > 0 ? filters.directors : undefined,
      countries: filters.countries.length > 0 ? filters.countries : undefined,
      ageRatings: filters.ageRatings.length > 0 ? filters.ageRatings : undefined,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      ratingMin: filters.ratingMin,
      ratingMax: filters.ratingMax,
      durationMin: filters.durationMin,
      durationMax: filters.durationMax,
      accessType: filters.accessType,
      sort: filters.sort !== DEFAULT_MOVIE_SORT ? filters.sort : undefined,
      limit: 30,
    }),
    [isMoviesTab, effectiveTerm, filters],
  );

  const seriesQuery: SeriesQuery = useMemo(
    () => ({
      search: tab === "series" ? effectiveTerm || undefined : undefined,
      genres: seriesFilters.genres.length > 0 ? seriesFilters.genres : undefined,
      languages: seriesFilters.languages.length > 0 ? seriesFilters.languages : undefined,
      yearFrom: seriesFilters.yearFrom,
      yearTo: seriesFilters.yearTo,
      accessType: seriesFilters.accessType,
      sort: seriesFilters.sort !== DEFAULT_SERIES_SORT ? seriesFilters.sort : undefined,
      limit: 30,
    }),
    [tab, effectiveTerm, seriesFilters],
  );

  return {
    tab,
    setTab,
    allowedTabs,
    search,
    setSearch,
    effectiveTerm,
    isDebouncing,
    isTooShort,
    clearSearch,
    filters,
    seriesFilters,
    updateFilters,
    updateSeriesFilters,
    clearAll,
    density,
    setDensity,
    activeCount,
    pills,
    movieQuery,
    seriesQuery,
    movieSortOptions,
    seriesSortOptions,
    hydrated,
  };
}

function rangeLabel(from: number | undefined, to: number | undefined): string {
  if (from !== undefined && to !== undefined) return from === to ? String(from) : `${from}–${to}`;
  if (from !== undefined) return `≥ ${from}`;
  return `≤ ${to}`;
}

function durationPillLabel(
  min: number | undefined,
  max: number | undefined,
  t: { filters: { durationShort: string; durationMedium: string; durationLong: string } },
): string {
  if (min === undefined && max === 90) return t.filters.durationShort;
  if (min === 91 && max === 120) return t.filters.durationMedium;
  if (min === 121 && max === undefined) return t.filters.durationLong;
  return `${min ?? 0}–${max === undefined ? "∞" : max}m`;
}
