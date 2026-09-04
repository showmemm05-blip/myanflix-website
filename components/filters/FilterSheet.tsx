"use client";

import { hasMyanmar } from "@/components/books/reader-settings";
import { useState, type ReactNode } from "react";
import { Check, Crown, LoaderCircle, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { chipClass } from "@/components/system/Chip";
import { SearchableMultiSelect, type MultiSelectOption } from "./SearchableMultiSelect";
import { useActorSearch } from "@/hooks/use-actors";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { AccessType, AgeRating, FacetValue } from "@/types/movie";
import { AGE_RATING_LABELS, type ActorSelection, type FilterState } from "./filter-types";

/** The segmented-track shell shared by the access picker. */
const SEGMENT_TRACK = "grid gap-1 rounded-3xl bg-white/5 p-1 ring-1 ring-white/10 ring-inset";

const CURRENT_YEAR = new Date().getFullYear();

/** Custom-duration slider domain. The right edge means "no upper bound". */
const DURATION_SLIDER_MAX = 240;

/**
 * The unified facet shape the sheet renders from — movie facets carry all six
 * lists, series facets only genres/languages/years. A missing or empty list
 * HIDES its section (the auto-hide rule): only values that exist in the DB
 * are ever offered, so nothing here can produce a zero-result filter.
 */
export interface FilterSheetFacets {
  genres: FacetValue[];
  languages: FacetValue[];
  countries?: FacetValue[];
  ageRatings?: FacetValue[];
  directors?: FacetValue[];
  years: { min: number; max: number } | null;
}

/**
 * One sheet for both the Movies and Series filters.
 *
 * Structure is deliberately header / scroll / footer: the count and Clear stay
 * pinned at the top, and the "Show N results" button stays reachable at the
 * bottom without scrolling back. Every option list is DB-derived (facets);
 * the footer count is the SERVER's total for the exact query on screen.
 */
export function FilterSheet({
  open,
  onOpenChange,
  values,
  onChange,
  onClear,
  sortOptions,
  isSeries = false,
  facets,
  activeCount,
  resultTotal,
  isCounting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  /** Built once by the surface from t.filters.sort* — relevance is only in the list while a term is active. */
  sortOptions: { value: string; label: string }[];
  /** Series tab: only Sort/Genre/Language/Year/Access render. */
  isSeries?: boolean;
  facets: FilterSheetFacets | undefined;
  activeCount: number;
  /** The backend's total for the current filtered query — the same number the results header shows. */
  resultTotal: number | undefined;
  isCounting?: boolean;
}) {
  const { t } = useLanguage();

  // The cast picker's live search — the term lives here (it's sheet-local UI
  // state), the request goes through the shared hook.
  const [actorTerm, setActorTerm] = useState("");
  const actorSearch = useActorSearch(actorTerm);
  const actorOptions: MultiSelectOption[] = (actorSearch.data?.items ?? []).map((a) => ({
    id: a.id,
    label: a.name,
  }));

  const accessOptions: { label: string; value: AccessType | undefined; icon?: typeof Crown }[] = [
    { label: t.filters.accessAll, value: undefined },
    { label: t.filters.accessFree, value: "FREE" },
    { label: t.filters.accessPremium, value: "SUBSCRIPTION", icon: Crown },
  ];

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

  const years = facets?.years ?? null;
  const yearLo = years?.min ?? 1888;
  const yearHi = Math.max(years?.max ?? CURRENT_YEAR, CURRENT_YEAR);

  const yearPresets: { label: string; from?: number; to?: number }[] = [
    { label: t.filters.yearPresetThis, from: CURRENT_YEAR, to: CURRENT_YEAR },
    { label: t.filters.yearPresetLast5, from: CURRENT_YEAR - 4, to: CURRENT_YEAR },
    { label: "2010s", from: 2010, to: 2019 },
    { label: "2000s", from: 2000, to: 2009 },
    { label: t.filters.yearPresetOlder, to: 1999 },
  ];

  // Which duration chip is active — the buckets are pure presets over the raw
  // min/max, so they're recognized from the values rather than stored.
  const durationBucket =
    values.durationMin === undefined && values.durationMax === undefined
      ? "any"
      : values.durationMin === undefined && values.durationMax === 90
        ? "short"
        : values.durationMin === 91 && values.durationMax === 120
          ? "medium"
          : values.durationMin === 121 && values.durationMax === undefined
            ? "long"
            : "custom";
  // "Custom" is open when the user pressed the chip OR the applied values
  // already spell a range no bucket produces — derived, so a deep link with a
  // custom range opens the slider without any effect.
  const [customPressed, setCustomPressed] = useState(false);
  const durationCustomOpen = customPressed || durationBucket === "custom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // The built-in close floats over our own header row — one X, not two.
        showCloseButton={false}
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
                    onClick={() => onChange({ sort: option.value as FilterState["sort"] })}
                  />
                ))}
              </div>
              {values.sort === "mostPurchased" && (
                // HONESTY HINT — this ranking is the frozen pre-subscription
                // purchase table; the label must never imply live popularity.
                <p className="text-xs text-muted-foreground">{t.filters.sortMostPurchasedHint}</p>
              )}
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

            {(facets?.genres.length ?? 0) > 0 && (
              <Group
                label={t.filters.genre}
                value={values.genres.length > 0 ? String(values.genres.length) : undefined}
                onClear={() => onChange({ genres: [] })}
              >
                <div className="flex flex-wrap gap-2">
                  {facets!.genres.map((facet) => (
                    <Chip
                      key={facet.value}
                      label={facet.value}
                      active={values.genres.includes(facet.value)}
                      onClick={() => onChange({ genres: toggle(values.genres, facet.value) })}
                    />
                  ))}
                </div>
              </Group>
            )}

            {(facets?.languages.length ?? 0) > 0 && (
              <Group
                label={t.filters.language}
                value={values.languages.length > 0 ? String(values.languages.length) : undefined}
                onClear={() => onChange({ languages: [] })}
              >
                <div className="flex flex-wrap gap-2">
                  {facets!.languages.map((facet) => (
                    <Chip
                      key={facet.value}
                      label={facet.value}
                      active={values.languages.includes(facet.value)}
                      onClick={() => onChange({ languages: toggle(values.languages, facet.value) })}
                    />
                  ))}
                </div>
              </Group>
            )}

            {!isSeries && (
              <Group
                label={t.filters.actor}
                value={values.actors.length > 0 ? String(values.actors.length) : undefined}
                onClear={() => onChange({ actors: [] })}
              >
                <SearchableMultiSelect
                  options={actorOptions}
                  value={values.actors.map((a) => ({ id: a.id, label: a.name }))}
                  onChange={(next) =>
                    onChange({
                      actors: next.map((o): ActorSelection => ({ id: o.id, name: o.label })),
                    })
                  }
                  placeholder={t.filters.actorSearchPlaceholder}
                  onSearch={setActorTerm}
                  isLoading={actorSearch.isFetching}
                />
              </Group>
            )}

            {!isSeries && (facets?.directors?.length ?? 0) > 0 && (
              <Group
                label={t.filters.director}
                value={values.directors.length > 0 ? String(values.directors.length) : undefined}
                onClear={() => onChange({ directors: [] })}
              >
                <SearchableMultiSelect
                  options={facets!.directors!.map((f) => ({ id: f.value, label: f.value }))}
                  value={values.directors.map((d) => ({ id: d, label: d }))}
                  onChange={(next) => onChange({ directors: next.map((o) => o.id) })}
                  placeholder={t.filters.director}
                />
              </Group>
            )}

            {!isSeries && (facets?.countries?.length ?? 0) > 0 && (
              <Group
                label={t.filters.country}
                value={values.countries.length > 0 ? String(values.countries.length) : undefined}
                onClear={() => onChange({ countries: [] })}
              >
                <SearchableMultiSelect
                  options={facets!.countries!.map((f) => ({ id: f.value, label: f.value }))}
                  value={values.countries.map((c) => ({ id: c, label: c }))}
                  onChange={(next) => onChange({ countries: next.map((o) => o.id) })}
                  placeholder={t.filters.country}
                />
              </Group>
            )}

            {!isSeries && (facets?.ageRatings?.length ?? 0) > 0 && (
              <Group
                label={t.filters.ageRating}
                value={values.ageRatings.length > 0 ? String(values.ageRatings.length) : undefined}
                onClear={() => onChange({ ageRatings: [] })}
              >
                <div className="flex flex-wrap gap-2">
                  {facets!.ageRatings!.map((facet) => {
                    const rating = facet.value as AgeRating;
                    return (
                      <Chip
                        key={facet.value}
                        label={AGE_RATING_LABELS[rating] ?? facet.value}
                        active={values.ageRatings.includes(rating)}
                        onClick={() => onChange({ ageRatings: toggle(values.ageRatings, rating) })}
                      />
                    );
                  })}
                </div>
              </Group>
            )}

            {years && (
              <Group
                label={t.filters.releaseYear}
                value={
                  values.yearFrom !== undefined || values.yearTo !== undefined
                    ? `${values.yearFrom ?? yearLo}–${values.yearTo ?? yearHi}`
                    : undefined
                }
                onClear={() => onChange({ yearFrom: undefined, yearTo: undefined })}
              >
                <div className="flex flex-wrap gap-2">
                  {yearPresets.map((preset) => {
                    const active =
                      values.yearFrom === preset.from && values.yearTo === preset.to;
                    return (
                      <Chip
                        key={preset.label}
                        label={preset.label}
                        active={active}
                        onClick={() =>
                          onChange(
                            active
                              ? { yearFrom: undefined, yearTo: undefined }
                              : { yearFrom: preset.from, yearTo: preset.to },
                          )
                        }
                        className="nums"
                      />
                    );
                  })}
                </div>
                <RangeSlider
                  min={yearLo}
                  max={yearHi}
                  step={1}
                  lo={values.yearFrom}
                  hi={values.yearTo}
                  format={(v) => String(v)}
                  onCommit={(lo, hi) => onChange({ yearFrom: lo, yearTo: hi })}
                />
              </Group>
            )}

            {!isSeries && (
              <Group
                label={t.filters.rating}
                value={
                  values.ratingMin !== undefined || values.ratingMax !== undefined
                    ? `${values.ratingMin ?? 0}–${values.ratingMax ?? 10}`
                    : undefined
                }
                onClear={() => onChange({ ratingMin: undefined, ratingMax: undefined })}
              >
                <RangeSlider
                  min={0}
                  max={10}
                  step={0.5}
                  lo={values.ratingMin}
                  hi={values.ratingMax}
                  format={(v) => String(v)}
                  anyLabel={t.filters.anyRating}
                  onCommit={(lo, hi) => onChange({ ratingMin: lo, ratingMax: hi })}
                />
              </Group>
            )}

            {!isSeries && (
              <Group
                label={t.filters.duration}
                value={durationBucket !== "any" ? durationLabel(values, t.filters) : undefined}
                onClear={() => {
                  setCustomPressed(false);
                  onChange({ durationMin: undefined, durationMax: undefined });
                }}
              >
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label={t.filters.all}
                    active={durationBucket === "any" && !customPressed}
                    onClick={() => {
                      setCustomPressed(false);
                      onChange({ durationMin: undefined, durationMax: undefined });
                    }}
                  />
                  <Chip
                    label={t.filters.durationShort}
                    active={durationBucket === "short"}
                    onClick={() => {
                      setCustomPressed(false);
                      onChange({ durationMin: undefined, durationMax: 90 });
                    }}
                  />
                  <Chip
                    label={t.filters.durationMedium}
                    active={durationBucket === "medium"}
                    onClick={() => {
                      setCustomPressed(false);
                      onChange({ durationMin: 91, durationMax: 120 });
                    }}
                  />
                  <Chip
                    label={t.filters.durationLong}
                    active={durationBucket === "long"}
                    onClick={() => {
                      setCustomPressed(false);
                      onChange({ durationMin: 121, durationMax: undefined });
                    }}
                  />
                  <Chip
                    label={t.filters.durationCustom}
                    active={durationCustomOpen}
                    onClick={() => setCustomPressed(true)}
                  />
                </div>
                {durationCustomOpen && (
                  <RangeSlider
                    min={0}
                    max={DURATION_SLIDER_MAX}
                    step={5}
                    lo={values.durationMin}
                    hi={values.durationMax}
                    // The right edge means "no maximum" — a 4-hour epic must
                    // not be silently excluded by a slider's arbitrary edge.
                    format={(v, edge) =>
                      edge === "hi" && v === DURATION_SLIDER_MAX ? "∞" : `${v}m`
                    }
                    onCommit={(lo, hi) => onChange({ durationMin: lo, durationMax: hi })}
                  />
                )}
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
            {/* The SERVER's total for this exact query — the one honest number,
                shared with the results header. A spinner while it's in flight,
                never a stale or page-local count. */}
            {isCounting || resultTotal === undefined ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              t.filters.showResults(resultTotal)
            )}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

/** The bucket-or-range label the duration group shows next to its reset. */
function durationLabel(
  values: Pick<FilterState, "durationMin" | "durationMax">,
  labels: { durationShort: string; durationMedium: string; durationLong: string },
): string {
  const { durationMin: min, durationMax: max } = values;
  if (min === undefined && max === 90) return labels.durationShort;
  if (min === 91 && max === 120) return labels.durationMedium;
  if (min === 121 && max === undefined) return labels.durationLong;
  return `${min ?? 0}–${max === undefined ? "∞" : max}m`;
}

/**
 * A two-thumb range over base-ui's Slider. Drags update LOCAL state only;
 * the canonical filter (and therefore the query) updates on commit — a drag
 * must not fire a request per pixel. Full span means "any": both bounds
 * leave the state as `undefined` and nothing is sent.
 */
function RangeSlider({
  min,
  max,
  step,
  lo,
  hi,
  onCommit,
  format,
  anyLabel,
}: {
  min: number;
  max: number;
  step: number;
  lo: number | undefined;
  hi: number | undefined;
  onCommit: (lo: number | undefined, hi: number | undefined) => void;
  format: (value: number, edge: "lo" | "hi") => string;
  /** Shown instead of the bounds while the span is full ("Any"). */
  anyLabel?: string;
}) {
  const applied: [number, number] = [lo ?? min, hi ?? max];
  const [draft, setDraft] = useState<[number, number]>(applied);

  // Re-sync when the applied filter changes from outside (clear all, pills).
  const appliedKey = `${applied[0]}:${applied[1]}`;
  const [seenKey, setSeenKey] = useState(appliedKey);
  if (appliedKey !== seenKey) {
    setSeenKey(appliedKey);
    setDraft(applied);
  }

  const isFullSpan = draft[0] <= min && draft[1] >= max;

  return (
    <div className="flex flex-col gap-2 px-1 pt-1">
      <Slider
        value={draft}
        min={min}
        max={max}
        step={step}
        onValueChange={(value) => {
          if (Array.isArray(value) && value.length === 2) {
            setDraft([value[0], value[1]]);
          }
        }}
        onValueCommitted={(value) => {
          if (!Array.isArray(value) || value.length !== 2) return;
          const [nextLo, nextHi] = value;
          onCommit(nextLo <= min ? undefined : nextLo, nextHi >= max ? undefined : nextHi);
        }}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground nums">
        {isFullSpan && anyLabel ? (
          <span>{anyLabel}</span>
        ) : (
          <>
            <span>{format(draft[0], "lo")}</span>
            <span>{format(draft[1], "hi")}</span>
          </>
        )}
      </div>
    </div>
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
        <h3
        className="text-kicker"
        // .text-kicker tracks 0.18em — right for Latin eyebrows, wrong for
        // Myanmar (mm is the default locale, so most of these labels ARE
        // Burmese). Same content-driven guard the readers use.
        style={{ letterSpacing: hasMyanmar(label) ? 0 : undefined }}
      >
        {label}
      </h3>
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
