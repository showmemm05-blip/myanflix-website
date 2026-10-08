"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { translations, type Language, type TranslationShape } from "@/lib/i18n/translations";

const STORAGE_KEY = "myanflix-language";
const DEFAULT_LANGUAGE: Language = "mm";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Nested translation tree for the active language — e.g. `t.nav.home`, fully typed. */
  t: TranslationShape;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─ The chosen language as a tiny external store for useSyncExternalStore.
// Read from storage once (on the client's first read), then changed only by
// setLanguage — which tells the subscribers.
const listeners = new Set<() => void>();
let clientLanguage: Language | null = null;

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "mm") return stored;
  } catch {
    // Storage blocked — the default stands.
  }
  return DEFAULT_LANGUAGE;
}

function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getLanguageSnapshot(): Language {
  if (clientLanguage === null) clientLanguage = readStoredLanguage();
  return clientLanguage;
}

function getServerLanguageSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The server renders the real default, and so does the hydrating client
  // (getServerLanguageSnapshot), so there is no hydration mismatch; React
  // then switches to the stored choice. No lazy useState initialiser reading
  // localStorage (that WOULD mismatch) and no mount effect re-rendering the
  // whole tree.
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  const setLanguage = useCallback((next: Language) => {
    clientLanguage = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked — the choice still holds for this visit.
    }
    for (const listener of listeners) listener();
  }, []);

  const value = useMemo(() => ({ language, setLanguage, t: translations[language] }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
