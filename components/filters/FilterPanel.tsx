"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MovieSortOption } from "@/types/movie";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama",
  "Family", "Fantasy", "History", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller",
];
const LANGUAGES = ["English", "Burmese", "Korean"];
const RATINGS = [9, 8, 7, 6, 5];
const PRICES = [
  { label: "Any price", value: undefined },
  { label: "Free", value: 0 },
  { label: "Under 5,000 Ks", value: 5000 },
  { label: "Under 10,000 Ks", value: 10000 },
];
const SORT_OPTIONS: { label: string; value: MovieSortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "Highest Rated", value: "rating" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

export interface FilterState {
  genre?: string;
  language?: string;
  releaseYear?: number;
  minRating?: number;
  maxPrice?: number;
  sort: MovieSortOption;
}

export function FilterPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const activeCount = [filters.genre, filters.language, filters.releaseYear, filters.minRating, filters.maxPrice].filter(
    (v) => v !== undefined,
  ).length;

  return (
    <div className="glass-card flex flex-col gap-4 rounded-xl border-white/[0.08] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-xs">
            <X className="size-3.5" />
            Clear ({activeCount})
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Sort by</Label>
        <Select value={filters.sort} onValueChange={(v) => v && onChange({ sort: v as MovieSortOption })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Genre</Label>
        <Select
          value={filters.genre ?? "all"}
          onValueChange={(v) => onChange({ genre: v && v !== "all" ? v : undefined })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Language</Label>
        <Select
          value={filters.language ?? "all"}
          onValueChange={(v) => onChange({ language: v && v !== "all" ? v : undefined })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Minimum rating</Label>
        <Select
          value={filters.minRating?.toString() ?? "any"}
          onValueChange={(v) => onChange({ minRating: v === "any" ? undefined : Number(v) })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any rating</SelectItem>
            {RATINGS.map((r) => (
              <SelectItem key={r} value={r.toString()}>{r}+ rating</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Price</Label>
        <Select
          value={filters.maxPrice?.toString() ?? "any"}
          onValueChange={(v) => onChange({ maxPrice: v === "any" ? undefined : Number(v) })}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRICES.map((p) => (
              <SelectItem key={p.label} value={p.value === undefined ? "any" : p.value.toString()}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
