/**
 * Turning a language CODE into something a reader recognises.
 *
 * A curated table rather than `Intl.DisplayNames` alone: the names that
 * matter most here are the ones MyanFlix actually publishes in, and for
 * those the endonym (what speakers call their own language) reads better
 * than a translated exonym — a Burmese reader looks for မြန်မာ, not
 * "Burmese". Intl is the fallback for anything not listed, and the raw code
 * is the fallback for that.
 */
const ENDONYMS: Record<string, string> = {
  my: "မြန်မာ",
  en: "English",
  th: "ไทย",
  zh: "中文",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  ms: "Bahasa Melayu",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ru: "Русский",
  ar: "العربية",
};

/** English names, for the secondary line under an endonym. */
const ENGLISH_NAMES: Record<string, string> = {
  my: "Burmese",
  en: "English",
  th: "Thai",
  zh: "Chinese",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  id: "Indonesian",
  vi: "Vietnamese",
  ms: "Malay",
  fr: "French",
  es: "Spanish",
  de: "German",
  ru: "Russian",
  ar: "Arabic",
};

export function languageLabel(code: string): string {
  if (ENDONYMS[code]) return ENDONYMS[code];
  try {
    return (
      new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

/** The English name, when it differs from the label — otherwise null. */
export function languageSubLabel(code: string): string | null {
  const english = ENGLISH_NAMES[code];
  if (!english) return null;
  return english === languageLabel(code) ? null : english;
}

const PREFERRED_LANGUAGE_KEY = "myanflix-reading-language";

/**
 * The reader's last language choice, applied across the library: someone who
 * reads in Burmese should not have to pick it again on every title. Read
 * after mount (localStorage does not exist on the server) and always
 * validated against what a given book actually offers.
 */
export function loadPreferredLanguage(): string | null {
  try {
    return window.localStorage.getItem(PREFERRED_LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export function savePreferredLanguage(code: string) {
  try {
    window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, code);
  } catch {
    // The preference just won't persist.
  }
}

/**
 * Which language to open a book in: the reader's standing preference when
 * this book has it, otherwise the first one it offers.
 */
export function pickEdition<T extends { language: string }>(
  editions: T[],
  preferred: string | null,
): T | null {
  if (editions.length === 0) return null;
  return editions.find((e) => e.language === preferred) ?? editions[0];
}
