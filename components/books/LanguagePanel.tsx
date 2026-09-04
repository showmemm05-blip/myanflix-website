"use client";

import { Check, Languages } from "lucide-react";
import { Kicker } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";
import { languageLabel, languageSubLabel } from "@/lib/books/languages";
import { cn } from "@/lib/utils";
import type { BookEdition } from "@/types/book";

/**
 * The languages a book is actually published in, and the one being read.
 *
 * A panel rather than a dropdown: on a translated title the language is a
 * headline fact about what you are getting, not a setting to go hunting for.
 * The API only ever sends published editions, so everything listed here is
 * something the reader can genuinely open.
 */
export function LanguagePanel({
  editions,
  selectedId,
  onSelect,
  className,
}: {
  editions: BookEdition[];
  selectedId: string | null;
  onSelect: (edition: BookEdition) => void;
  className?: string;
}) {
  const { t } = useLanguage();

  if (editions.length === 0) return null;

  return (
    <section className={cn("glass-card p-5", className)}>
      <Kicker className="mb-3 flex items-center gap-2">
        <Languages className="size-3.5" />
        {t.book.availableLanguages}
      </Kicker>

      {/* A single-language book states the fact instead of offering a choice
          that isn't one. */}
      {editions.length === 1 ? (
        <p className="font-heading text-base">
          {languageLabel(editions[0].language)}
          {languageSubLabel(editions[0].language) && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {languageSubLabel(editions[0].language)}
            </span>
          )}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {editions.map((edition) => {
            const selected = edition.id === selectedId;
            const sub = languageSubLabel(edition.language);
            return (
              <li key={edition.id}>
                <button
                  type="button"
                  onClick={() => onSelect(edition)}
                  aria-pressed={selected}
                  className={cn(
                    "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "bg-primary/15 text-foreground ring-1 ring-primary/30 ring-inset"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {languageLabel(edition.language)}
                    </span>
                    {sub && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {sub}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
