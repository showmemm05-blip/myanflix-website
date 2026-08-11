"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, CalendarDays, Crown, Globe, Tags, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AccessType } from "@/types/movie";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama",
  "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller",
];
const LANGUAGES = ["English", "Burmese", "Korean"];
const ACCESS_TYPES: { label: string; value: AccessType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Free", value: "FREE" },
  { label: "Subscription", value: "SUBSCRIPTION" },
];
const CURRENT_YEAR = new Date().getFullYear();
const RELEASE_YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i);

export type SeriesSortOption = "newest" | "title";
const SORT_OPTIONS: { label: string; value: SeriesSortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "A–Z", value: "title" },
];

export interface SeriesFilterState {
  genre?: string;
  language?: string;
  releaseYear?: number;
  accessType?: AccessType;
  sort: SeriesSortOption;
}

function FilterSection({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--primary)]"
          : "border-white/10 bg-secondary/40 text-muted-foreground hover:border-white/20 hover:bg-secondary hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function SeriesFilterPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: SeriesFilterState;
  onChange: (next: Partial<SeriesFilterState>) => void;
  onClear: () => void;
}) {
  const activeCount = [filters.genre, filters.language, filters.releaseYear, filters.accessType].filter(
    (v) => v !== undefined,
  ).length;

  return (
    <div className="glass-card flex flex-col gap-5 rounded-xl border-white/[0.08] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-xs">
            <X className="size-3.5" />
            Clear ({activeCount})
          </Button>
        )}
      </div>

      <FilterSection icon={ArrowUpDown} label="Sort by">
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((o) => (
            <FilterChip key={o.value} label={o.label} active={filters.sort === o.value} onClick={() => onChange({ sort: o.value })} />
          ))}
        </div>
      </FilterSection>

      <Separator />

      <FilterSection icon={Tags} label="Genre">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" active={!filters.genre} onClick={() => onChange({ genre: undefined })} />
          {GENRES.map((g) => (
            <FilterChip
              key={g}
              label={g}
              active={filters.genre === g}
              onClick={() => onChange({ genre: filters.genre === g ? undefined : g })}
            />
          ))}
        </div>
      </FilterSection>

      <Separator />

      <FilterSection icon={Globe} label="Language">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" active={!filters.language} onClick={() => onChange({ language: undefined })} />
          {LANGUAGES.map((l) => (
            <FilterChip
              key={l}
              label={l}
              active={filters.language === l}
              onClick={() => onChange({ language: filters.language === l ? undefined : l })}
            />
          ))}
        </div>
      </FilterSection>

      <Separator />

      <FilterSection icon={CalendarDays} label="Release year">
        <Select
          value={filters.releaseYear?.toString() ?? "all"}
          onValueChange={(v) => onChange({ releaseYear: v && v !== "all" ? Number(v) : undefined })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any year</SelectItem>
            {RELEASE_YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <Separator />

      <FilterSection icon={Crown} label="Access">
        <div className="flex flex-wrap gap-2">
          {ACCESS_TYPES.map((a) => (
            <FilterChip
              key={a.label}
              label={a.label}
              active={filters.accessType === a.value}
              onClick={() => onChange({ accessType: a.value })}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
