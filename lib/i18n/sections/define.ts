import { useLanguage } from "@/lib/context/language-context";
import type { Language } from "@/lib/i18n/translations";

/**
 * PER-AREA STRINGS — a tiny typed helper so every part of the site can keep
 * its own new English + Burmese text in its own file, instead of everyone
 * editing the one shared `translations.ts` at the same time.
 *
 * English is the reference shape. The Burmese object must have exactly the
 * same keys and the same kinds of values (a string where English has a
 * string, a `(n: number) => string` where English has one), so a missing or
 * mistyped Burmese string is a compile error, never a silent English
 * fallback.
 *
 *   // lib/i18n/sections/wallet.ts
 *   export const walletText = defineSection({
 *     en: { title: "Wallet", items: (n: number) => `${n} items` },
 *     mm: { title: "ပိုက်ဆံအိတ်", items: (n: number) => `${n} ခု` },
 *   });
 *
 *   // in a client component
 *   const w = useSection(walletText);
 *   <h1>{w.title}</h1>
 */
export type Section<T> = Readonly<Record<Language, T>>;

export function defineSection<T extends object>(strings: { en: T; mm: NoInfer<T> }): Section<T> {
  return strings;
}

/**
 * The active language's strings for one section. A hook: call it from client
 * components only (this file has no "use client" so that a server component
 * can still import `defineSection` / `pickSection` from it).
 */
export function useSection<T>(section: Section<T>): T {
  const { language } = useLanguage();
  return section[language];
}

/** The same lookup without the hook — for code that already knows the language. */
export function pickSection<T>(section: Section<T>, language: Language): T {
  return section[language];
}
