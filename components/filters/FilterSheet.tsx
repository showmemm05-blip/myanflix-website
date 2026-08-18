"use client";

import type { ReactNode } from "react";
import { Check, Crown, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { chipClass } from "@/components/system/Chip";
import { BROWSE_GENRES as GENRES } from "@/components/browse/genres";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { AccessType } from "@/types/movie";
import type { FilterSheetValues } from "./filter-types";


const LANGUAGES = ["English", "Burmese", "Korean"];
const CURRENT_YEAR = new Date().getFullYear();
/**
 * The full twenty-year window, exactly as the original year dropdown offered
 * it. A shorter list plus a handful of decade buckets looked tidier but made
 * most of the catalog's years unreachable — every year in the domain has to be
 * pickable.
 */
const RELEASE_YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i);
/**
 * Every whole star, 1–10 — the same domain the original 0–10 / step-1 slider
 * covered (0 simply means "any"). Presented as taps rather than a drag so a
 * thumb can hit a value directly.
 */
const RATING_STEPS = Array.from({ length: 10 }, (_, i) => i + 1);

/** The segmented-track shell shared by the access and rating pickers. */
const SEGMENT_TRACK = "grid gap-1 rounded-3xl bg-white/5 p-1 ring-1 ring-white/10 ring-inset";

/**
 * One sheet for both the Movies and Series filters.
 *
 * Structure is deliberately header / scroll / footer: the count and Clear stay
 * pinned at the top, and the "Show N results" button stays reachable at the
 * bottom without scrolling back — on a phone the old panel buried both. Every
 * option is the same monochrome pill as the quick-genre rail, so nothing in the
 * chrome competes with artwork; only what you PICKED is bright.
 */
export function FilterSheet({
  open,
  onOpenChange,
  values,
  onChange,
  onClear,
  sortOptions,
  showRating = false,
  activeCount,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: FilterSheetValues;
  onChange: (next: Partial<FilterSheetValues>) => void;
  onClear: () => void;
  sortOptions: { value: string; label: string }[];
  /** Movies only — series have no rating to filter on. */
  showRating?: boolean;
  activeCount: number;
  /** How many titles the current filters match, shown on the apply button. */
  resultCount: number;
}) {
  const { t } = useLanguage();

  const accessOptions: { label: string; value: AccessType | undefined; icon?: typeof Crown }[] = [
    { label: t.filters.accessAll, value: undefined },
    { label: t.filters.accessFree, value: "FREE" },
    { label: t.filters.accessPremium, value: "SUBSCRIPTION", icon: Crown },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // The built-in close floats over our own header row — one X, not two.
        showCloseButton={false}
        // The side variant defaults to w-3/4, which left a 281px sheet on a
        // phone — plain utilities now, so tailwind-merge lets these win.
        className="flex w-full flex-col gap-0 border-white/10 bg-background p-0 sm:max-w-md"
      >
        <SheetTitle className="sr-only">{t.filters.title}</SheetTitle>

        <header className="relative isolate flex items-start justify-between gap-3 overflow-hidden border-b border-white/[0.07] px-5 py-4">
          <div
            aria-hidden
            className="aurora-wash-soft pointer-events-none absolute inset-0 -z-10 opacity-40 blur-2xl"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              {t.filters.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeCount > 0 ? t.filters.activeCount(activeCount) : t.filters.noneApplied}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="focus-ring flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/8 hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                {t.filters.clearAll}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t.common.close}
              className="focus-ring flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/8 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col gap-7">
            <Group label={t.filters.sortBy}>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={values.sort === option.value}
                    onClick={() => onChange({ sort: option.value })}
                  />
                ))}
              </div>
            </Group>

            <Group label={t.filters.access}>
              {/* Segmented rather than loose chips — the three options are
                  mutually exclusive and always all visible. */}
              <div className={cn(SEGMENT_TRACK, "grid-cols-3")}>
                {accessOptions.map((option) => {
                  const active = values.accessType === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => onChange({ accessType: option.value })}
                      aria-pressed={active}
                      className={cn(
                        "focus-ring flex h-10 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-150 ease-out",
                        active
                          ? "bg-white text-black"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.icon && <option.icon className="size-3" />}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Group>

            <Group label={t.filters.genre} value={values.genre} onClear={() => onChange({ genre: undefined })}>
              <div className="flex flex-wrap gap-2">
                <Chip label={t.filters.all} active={!values.genre} onClick={() => onChange({ genre: undefined })} />
                {GENRES.map((genre) => (
                  <Chip
                    key={genre}
                    label={genre}
                    active={values.genre === genre}
                    onClick={() => onChange({ genre: values.genre === genre ? undefined : genre })}
                  />
                ))}
              </div>
            </Group>

            <Group
              label={t.filters.language}
              value={values.language}
              onClear={() => onChange({ language: undefined })}
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  label={t.filters.all}
                  active={!values.language}
                  onClick={() => onChange({ language: undefined })}
                />
                {LANGUAGES.map((language) => (
                  <Chip
                    key={language}
                    label={language}
                    active={values.language === language}
                    onClick={() => onChange({ language: values.language === language ? undefined : language })}
                  />
                ))}
              </div>
            </Group>

            <Group
              label={t.filters.releaseYear}
              value={values.releaseYear ? String(values.releaseYear) : undefined}
              onClear={() => onChange({ releaseYear: undefined })}
            >
              {/* A grid of years instead of a dropdown — one tap, and you can
                  see the whole range at once. */}
              <div className="grid grid-cols-4 gap-2">
                <Chip
                  label={t.filters.anyYear}
                  active={!values.releaseYear}
                  onClick={() => onChange({ releaseYear: undefined })}
                  className="col-span-4"
                />
                {RELEASE_YEARS.map((year) => (
                  <Chip
                    key={year}
                    label={String(year)}
                    active={values.releaseYear === year}
                    onClick={() => onChange({ releaseYear: values.releaseYear === year ? undefined : year })}
                    // Four to a row on the narrowest phone, so the pill keeps
                    // its 40px height but drops the wide side padding.
                    className="nums px-2"
                  />
                ))}
              </div>
            </Group>

            {showRating && (
              <Group
                label={t.filters.rating}
                value={values.minRating ? t.filters.ratingPlus(values.minRating) : undefined}
                onClear={() => onChange({ minRating: undefined })}
              >
                {/* Gold is the app's rating color, so the picked step wears it.
                    Eleven options (any + 1–10) wrap onto two rows rather than
                    squeezing into one unreadable strip. */}
                <div className={cn(SEGMENT_TRACK, "grid-cols-4 sm:grid-cols-6")}>
                  <RatingStep
                    label={t.filters.anyRating}
                    active={!values.minRating}
                    onClick={() => onChange({ minRating: undefined })}
                  />
                  {RATING_STEPS.map((step) => (
                    <RatingStep
                      key={step}
                      label={t.filters.ratingPlus(step)}
                      active={values.minRating === step}
                      onClick={() => onChange({ minRating: values.minRating === step ? undefined : step })}
                    />
                  ))}
                </div>
              </Group>
            )}
          </div>
        </div>

        {/* The pinned footer is the last thing above the home indicator, so it
            pads itself past the bottom inset — otherwise the primary button
            sits under it on a gesture-nav phone. */}
        <footer className="border-t border-white/[0.07] bg-background/95 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl">
          <Button
            className="h-11 w-full rounded-full text-sm font-semibold"
            onClick={() => onOpenChange(false)}
          >
            {t.filters.showResults(resultCount)}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function Group({
  label,
  value,
  onClear,
  children,
}: {
  label: string;
  /** When set, the group shows what's picked and offers a one-tap reset. */
  value?: string;
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-kicker">{label}</h3>
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="focus-ring flex items-center gap-1 rounded-full text-[11px] font-medium text-primary transition-opacity duration-150 ease-out hover:opacity-80"
          >
            {value}
            <X className="size-3" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Chip({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // `lg` — the same 40px pill the quick-genre rail uses, so a genre is the
      // same object and the same thumb target in both places.
      className={cn(chipClass({ tone: "mono", variant: "outline", size: "lg", selected: active }), className)}
    >
      {active && <Check className="size-3" />}
      {label}
    </button>
  );
}

function RatingStep({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring h-10 rounded-full text-xs font-medium transition-colors duration-150 ease-out",
        active ? "bg-premium text-premium-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
