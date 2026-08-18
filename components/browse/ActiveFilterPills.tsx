"use client";

import { X } from "lucide-react";

import { chipClass } from "@/components/system/Chip";
import { Kicker } from "@/components/system/Kicker";
import { useLanguage } from "@/lib/context/language-context";

export interface ActivePill {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * What's currently narrowing the results, each removable in one click. Without
 * this, a filter set inside the sheet and then forgotten looks like "the
 * catalog is missing things".
 *
 * These are the one place on a browse page where a chip is deliberately violet:
 * they represent an ACTION the user took, and the eye should find them before
 * it starts blaming the catalog.
 */
export function ActiveFilterPills({ pills, onClearAll }: { pills: ActivePill[]; onClearAll: () => void }) {
  const { t } = useLanguage();
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Kicker className="mr-0.5 hidden sm:block">{t.filters.title}</Kicker>
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={pill.onRemove}
          // The visible label is just the filter's value ("Action"), which
          // announces as a pill that does nothing. Say what pressing it does.
          aria-label={`${t.watchlist.remove}: ${pill.label}`}
          className={chipClass({ tone: "primary", variant: "outline", size: "md" })}
        >
          {pill.label}
          <X className="opacity-70" />
        </button>
      ))}
      {pills.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="focus-ring rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground hover:underline"
        >
          {t.browse.clearAll}
        </button>
      )}
    </div>
  );
}
