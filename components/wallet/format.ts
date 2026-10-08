import type { Language } from "@/lib/i18n/translations";

/**
 * Dates and times on the money pages. Latin digits in both languages (like
 * every other number on the site); Burmese month names in Burmese.
 */
const LOCALE: Record<Language, string> = { en: "en-GB", mm: "my-MM-u-nu-latn" };

/** "3:05 PM" / "15:05" */
export function moneyTime(iso: string, language: Language): string {
  const date = new Date(iso);
  return language === "mm"
    ? date.toLocaleTimeString(LOCALE.mm, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "4 Oct 2026" */
export function moneyDate(iso: string, language: Language): string {
  return new Date(iso).toLocaleDateString(LOCALE[language], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Local calendar-day key, for grouping a list by day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Today" / "Yesterday" / "4 Oct 2026". */
export function dayLabel(
  iso: string,
  language: Language,
  words: { today: string; yesterday: string },
  now: Date = new Date(),
): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return words.today;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === dayKey(yesterday.toISOString())) return words.yesterday;
  return moneyDate(iso, language);
}

/** "•••• 4471" — account numbers are masked in lists. */
export function maskAccountNumber(number: string): string {
  const digits = number.replace(/\s+/g, "");
  return digits.length <= 4 ? digits : `•••• ${digits.slice(-4)}`;
}
