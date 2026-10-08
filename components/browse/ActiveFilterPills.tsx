"use client";

import { RemovableChip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";

export interface ActivePill {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * What's currently narrowing the results, each removable in one click
 * (SearchResults board): a faint "FILTERS" overline (desktop), one
 * crimson-soft pill per value ("Remove filter: Burmese" to a screen reader),
 * and a crimson "Clear all". Without this, a filter set in the drawer and then
 * forgotten looks like "the catalogue is missing things".
 */
export function ActiveFilterPills({
  pills,
  onClearAll,
  className,
}: {
  pills: ActivePill[];
  onClearAll: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  if (pills.length === 0) return null;

  return (
    <div role="group" aria-label={sx.activeFilters} className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2", className)}>
      <span className="mr-0.5 text-kicker max-desk:hidden">{t.filters.title}</span>
      {pills.map((pill) => (
        <RemovableChip key={pill.key} label={pill.label} onRemove={pill.onRemove} className="nums" />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="mq-link h-9 cursor-pointer rounded-[6px] border-0 bg-transparent px-1.5 text-sm font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        {t.browse.clearAll}
      </button>
    </div>
  );
}
