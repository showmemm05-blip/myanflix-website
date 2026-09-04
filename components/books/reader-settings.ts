"use client";

/**
 * Reading preferences: how the page looks, not what is on it.
 *
 * Per-device rather than server-synced (the localStorage precedent the player
 * set for subtitle style) — the right text size on a phone is the wrong one
 * on a desktop, so syncing these to the server would actively make things
 * worse. They ARE per-user on the device (keyed by user id, `anon` when
 * signed out), so two people sharing a laptop don't fight over the page.
 */

// ── Option ids ─────────────────────────────────────────────────────────────
// These ids are the contract shared with the mobile readerPrefsStore — the
// spelling here is the spelling in AsyncStorage over there. Never rename.

export type ReaderTheme = "paper" | "sepia" | "night" | "amoled";
export type FontFamilyId = "serif" | "sans" | "dyslexic";
export type LineHeightId = "compact" | "normal" | "relaxed";
export type ReadingWidthId = "narrow" | "medium" | "wide" | "full";
export type MarginId = "s" | "m" | "l";
export type TextAlignId = "justify" | "left";
export type TextPageModeId = "scroll" | "paginated";
export type PageModeId = "scroll" | "single" | "double";
export type FitId = "width" | "height" | "screen";
export type PageBackgroundId = "theme" | "black" | "gray" | "white";
export type PageDirectionId = "ltr" | "rtl";
export type RotationId = 0 | 90 | 180 | 270;
export type SizePresetId = "s" | "m" | "l" | "xl";

export interface ReaderSettingsV2 {
  version: 2;
  theme: ReaderTheme;
  /** Continuous text scale — presets are sugar over this, never a replacement. */
  scale: number;
  fontFamily: FontFamilyId;
  lineHeight: LineHeightId;
  width: ReadingWidthId;
  margins: MarginId;
  textAlign: TextAlignId;
  showChapterTitle: boolean;
  /** Web-only: the text reader's continuous-scroll vs paginated mode. */
  textPageMode: TextPageModeId;
  /** In-reader dim overlay strength (1 = overlay absent), NOT OS brightness. */
  brightness: number;
  keepAwake: boolean;
  autoHideChrome: boolean;
  pageMode: PageModeId;
  fit: FitId;
  pageBackground: PageBackgroundId;
  pageDirection: PageDirectionId;
}

export const DEFAULT_READER_SETTINGS: ReaderSettingsV2 = {
  version: 2,
  theme: "paper",
  scale: 1,
  fontFamily: "serif",
  lineHeight: "normal",
  width: "medium",
  margins: "m",
  textAlign: "justify",
  showChapterTitle: true,
  textPageMode: "scroll",
  brightness: 1,
  keepAwake: true,
  autoHideChrome: true,
  pageMode: "scroll",
  fit: "width",
  pageBackground: "theme",
  pageDirection: "ltr",
};

// ── Themes ─────────────────────────────────────────────────────────────────

export const READER_THEME_CLASS: Record<ReaderTheme, string> = {
  paper: "reader-paper",
  sepia: "reader-sepia",
  night: "reader-night",
  amoled: "reader-amoled",
};

export const READER_THEMES: ReaderTheme[] = [
  "paper",
  "sepia",
  "night",
  "amoled",
];

/** Swatches for the theme picker — the actual paper/ink of each theme. */
export const READER_THEME_SWATCH: Record<
  ReaderTheme,
  { paper: string; ink: string }
> = {
  paper: { paper: "#faf7f1", ink: "#1c1a17" },
  sepia: { paper: "#f2e5cf", ink: "#3a2f22" },
  night: { paper: "#16161a", ink: "#ddd8d0" },
  amoled: { paper: "#000000", ink: "#d9d4cb" },
};

// ── Scale ──────────────────────────────────────────────────────────────────

export const SCALE_MIN = 0.85;
export const SCALE_MAX = 1.6;
export const SCALE_STEP = 0.05;

/** Preset chips are named points ON the continuous scale, not instead of it. */
export const SIZE_PRESETS: Record<SizePresetId, number> = {
  s: 0.9,
  m: 1,
  l: 1.15,
  xl: 1.35,
};
export const SIZE_PRESET_ORDER: SizePresetId[] = ["s", "m", "l", "xl"];

export function clampScale(value: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(value.toFixed(2))));
}

// ── Brightness (in-reader dim overlay) ─────────────────────────────────────

export const BRIGHTNESS_MIN = 0.4;
export const BRIGHTNESS_MAX = 1;

export function clampBrightness(value: number): number {
  return Math.min(
    BRIGHTNESS_MAX,
    Math.max(BRIGHTNESS_MIN, Number(value.toFixed(2))),
  );
}

// ── Class / value maps (literal Tailwind classes only) ─────────────────────

export const READER_WIDTH_CLASS: Record<ReadingWidthId, string> = {
  narrow: "max-w-[28rem]",
  medium: "max-w-[34rem]", // today's value — the unchanged default
  wide: "max-w-[42rem]",
  full: "max-w-none",
};

export const READER_MARGIN_CLASS: Record<MarginId, string> = {
  s: "px-4 sm:px-6",
  m: "px-6 sm:px-8", // today's value — the unchanged default
  l: "px-10 sm:px-14",
};

export const READER_FONT_CLASS: Record<FontFamilyId, string> = {
  serif: "font-reading",
  sans: "font-reading-sans",
  dyslexic: "font-reading-dyslexic",
};

export const LINE_HEIGHT_VALUE: Record<LineHeightId, number> = {
  compact: 1.55,
  normal: 1.72, // today's .prose-reading value — the unchanged default
  relaxed: 1.9,
};

export const PAGE_BACKGROUND_VALUE: Record<PageBackgroundId, string> = {
  theme: "var(--paper)",
  black: "#000000",
  gray: "#52525b",
  white: "#ffffff",
};

// ── Persistence ────────────────────────────────────────────────────────────

const LEGACY_THEME_KEY = "myanflix-reader-theme";
const LEGACY_SCALE_KEY = "myanflix-reader-scale";
const LEGACY_FIT_KEY = "myanflix-reader-fit";

function settingsKey(userId: string | null | undefined): string {
  return `myanflix-reader:v2:${userId || "anon"}`;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/**
 * Every field individually validated: a v2 blob written by a future version
 * (or hand-edited) must never crash the reader — unknown values silently
 * fall back to the default for that one field.
 */
function sanitizeSettings(raw: unknown): ReaderSettingsV2 {
  const d = DEFAULT_READER_SETTINGS;
  if (typeof raw !== "object" || raw === null) return { ...d };
  const r = raw as Record<string, unknown>;
  return {
    version: 2,
    theme: isOneOf(r.theme, READER_THEMES) ? r.theme : d.theme,
    scale:
      typeof r.scale === "number" && Number.isFinite(r.scale)
        ? clampScale(r.scale)
        : d.scale,
    fontFamily: isOneOf(r.fontFamily, ["serif", "sans", "dyslexic"] as const)
      ? r.fontFamily
      : d.fontFamily,
    lineHeight: isOneOf(r.lineHeight, ["compact", "normal", "relaxed"] as const)
      ? r.lineHeight
      : d.lineHeight,
    width: isOneOf(r.width, ["narrow", "medium", "wide", "full"] as const)
      ? r.width
      : d.width,
    margins: isOneOf(r.margins, ["s", "m", "l"] as const) ? r.margins : d.margins,
    textAlign: isOneOf(r.textAlign, ["justify", "left"] as const)
      ? r.textAlign
      : d.textAlign,
    showChapterTitle:
      typeof r.showChapterTitle === "boolean"
        ? r.showChapterTitle
        : d.showChapterTitle,
    textPageMode: isOneOf(r.textPageMode, ["scroll", "paginated"] as const)
      ? r.textPageMode
      : d.textPageMode,
    brightness:
      typeof r.brightness === "number" && Number.isFinite(r.brightness)
        ? clampBrightness(r.brightness)
        : d.brightness,
    keepAwake: typeof r.keepAwake === "boolean" ? r.keepAwake : d.keepAwake,
    autoHideChrome:
      typeof r.autoHideChrome === "boolean" ? r.autoHideChrome : d.autoHideChrome,
    pageMode: isOneOf(r.pageMode, ["scroll", "single", "double"] as const)
      ? r.pageMode
      : d.pageMode,
    fit: isOneOf(r.fit, ["width", "height", "screen"] as const) ? r.fit : d.fit,
    pageBackground: isOneOf(
      r.pageBackground,
      ["theme", "black", "gray", "white"] as const,
    )
      ? r.pageBackground
      : d.pageBackground,
    pageDirection: isOneOf(r.pageDirection, ["ltr", "rtl"] as const)
      ? r.pageDirection
      : d.pageDirection,
  };
}

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Seed a fresh v2 blob from the pre-suite keys, so nobody's theme or text
 * size resets on upgrade. The legacy keys are read-only from here on and
 * never deleted — another user of this device may still need to migrate.
 */
function seedFromLegacy(): ReaderSettingsV2 {
  const seeded: ReaderSettingsV2 = { ...DEFAULT_READER_SETTINGS };
  try {
    const theme = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (isOneOf(theme, READER_THEMES)) seeded.theme = theme;
    const scale = Number(window.localStorage.getItem(LEGACY_SCALE_KEY));
    if (scale >= SCALE_MIN && scale <= SCALE_MAX) seeded.scale = scale;
    const fit = window.localStorage.getItem(LEGACY_FIT_KEY);
    // The old page reader only knew width|page; 'page' meant the whole sheet
    // on screen, which is exactly what 'screen' now means.
    if (fit === "width") seeded.fit = "width";
    else if (fit === "page") seeded.fit = "screen";
  } catch {
    // Storage blocked — defaults are fine.
  }
  return seeded;
}

/**
 * Load order: this user's v2 blob → the anon v2 blob (settings chosen while
 * signed out follow the reader through login, copied once) → the legacy
 * single-value keys → defaults. Always returns a fully-populated object.
 */
export function loadReaderSettings(
  userId: string | null | undefined,
): ReaderSettingsV2 {
  if (typeof window === "undefined") return { ...DEFAULT_READER_SETTINGS };
  const uid = userId || "anon";

  const own = readJson(settingsKey(uid));
  if (own) return sanitizeSettings(own);

  if (uid !== "anon") {
    const anon = readJson(settingsKey("anon"));
    if (anon) {
      const carried = sanitizeSettings(anon);
      // Copy once so future anon changes don't keep leaking into this user.
      saveReaderSettings(uid, carried);
      return carried;
    }
  }

  return seedFromLegacy();
}

export function saveReaderSettings(
  userId: string | null | undefined,
  settings: ReaderSettingsV2,
) {
  try {
    window.localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
  } catch {
    // The preference just won't persist.
  }
}

// ── Per-book view memory (page readers) ────────────────────────────────────

/**
 * What a specific book "looked like when you closed it": layout, fit, zoom
 * and rotation are properties of a given scan (a wide manga spread wants
 * different treatment from an A5 novel scan), so they remember per book and
 * override the global settings on open.
 */
export interface BookViewMemory {
  pageMode?: PageModeId;
  fit?: FitId;
  zoom?: number;
  rotation?: RotationId;
}

function bookViewKey(userId: string | null | undefined, bookId: string): string {
  return `myanflix-reader-book:v1:${userId || "anon"}:${bookId}`;
}

export function loadBookView(
  userId: string | null | undefined,
  bookId: string,
): BookViewMemory {
  if (typeof window === "undefined") return {};
  const raw = readJson(bookViewKey(userId, bookId));
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const view: BookViewMemory = {};
  if (isOneOf(r.pageMode, ["scroll", "single", "double"] as const))
    view.pageMode = r.pageMode;
  if (isOneOf(r.fit, ["width", "height", "screen"] as const)) view.fit = r.fit;
  if (typeof r.zoom === "number" && r.zoom >= 0.5 && r.zoom <= 3)
    view.zoom = r.zoom;
  if (r.rotation === 0 || r.rotation === 90 || r.rotation === 180 || r.rotation === 270)
    view.rotation = r.rotation;
  return view;
}

/** Pending debounced writes, merged per storage key so no patch is lost. */
const pendingBookViews = new Map<
  string,
  { view: BookViewMemory; timer: ReturnType<typeof setTimeout> }
>();

const BOOK_VIEW_DEBOUNCE_MS = 500;

/**
 * Debounced (zoom arrives per wheel tick — writing localStorage on every
 * tick would jank the pan). Patches merge into whatever is already stored.
 */
export function saveBookView(
  userId: string | null | undefined,
  bookId: string,
  patch: BookViewMemory,
) {
  if (typeof window === "undefined") return;
  const key = bookViewKey(userId, bookId);
  const pending = pendingBookViews.get(key);
  if (pending) clearTimeout(pending.timer);
  const view = { ...loadBookView(userId, bookId), ...pending?.view, ...patch };
  const timer = setTimeout(() => {
    pendingBookViews.delete(key);
    try {
      window.localStorage.setItem(key, JSON.stringify(view));
    } catch {
      // The memory just won't persist.
    }
  }, BOOK_VIEW_DEBOUNCE_MS);
  pendingBookViews.set(key, { view, timer });
}

// ── Legacy single-value API ────────────────────────────────────────────────
// Kept so ChapterReader/PageReader compile unchanged until their builders
// switch them over to loadReaderSettings. Never delete the keys they read —
// migration for other users of this device depends on them.

/** @deprecated Use loadReaderSettings(userId).theme — kept until the readers switch to the v2 store. */
export function loadReaderTheme(): ReaderTheme {
  try {
    const stored = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (isOneOf(stored, READER_THEMES)) return stored;
  } catch {
    // Storage blocked — paper is a fine default.
  }
  return "paper";
}

/** @deprecated Use saveReaderSettings — kept until the readers switch to the v2 store. */
export function saveReaderTheme(theme: ReaderTheme) {
  try {
    window.localStorage.setItem(LEGACY_THEME_KEY, theme);
  } catch {
    // The preference just won't persist.
  }
}

/** @deprecated Use loadReaderSettings(userId).scale — kept until the readers switch to the v2 store. */
export function loadReaderScale(): number {
  try {
    const stored = Number(window.localStorage.getItem(LEGACY_SCALE_KEY));
    if (stored >= SCALE_MIN && stored <= SCALE_MAX) return stored;
  } catch {
    // Fall through to the default.
  }
  return 1;
}

/** @deprecated Use saveReaderSettings — kept until the readers switch to the v2 store. */
export function saveReaderScale(scale: number) {
  try {
    window.localStorage.setItem(LEGACY_SCALE_KEY, String(scale));
  } catch {
    // The preference just won't persist.
  }
}

/**
 * Myanmar script must never be letter-spaced (tracking pulls combining marks
 * off their consonants) and needs looser leading than Latin. The check is
 * content-driven, not locale-driven: mm is the default UI language, so any
 * translated chrome string is usually Burmese, but titles and numbers mix
 * scripts freely. Mirrors the mobile app's containsMyanmar guard.
 */
const MYANMAR_SCRIPT = /[\u1000-\u109F\uAA60-\uAA7F]/;

export function hasMyanmar(text: string | null | undefined): boolean {
  return typeof text === "string" && MYANMAR_SCRIPT.test(text);
}
