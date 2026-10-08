"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button, BusyDots } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { FilterChip } from "@/components/system/Chip";
import { SegmentedControl, type SegmentOption } from "@/components/system/SegmentedControl";
import { fieldClass } from "@/components/system/Field";
import { CloseIcon, CrownIcon, StarIcon } from "@/components/system/icons";
import { SearchableMultiSelect, type MultiSelectOption } from "./SearchableMultiSelect";
import { useActorSearch } from "@/hooks/use-actors";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";
import type { AccessType, AgeRating, FacetValue } from "@/types/movie";
import { AGE_RATING_LABELS, type ActorSelection, type FilterState } from "./filter-types";

const CURRENT_YEAR = new Date().getFullYear();
/** The earliest year a film can have — the From/To fields clamp into [this, next year]. */
const FIRST_FILM_YEAR = 1888;

/** Custom-duration slider domain. The right edge means "no upper bound". */
const DURATION_SLIDER_MAX = 240;

/** The minimum-rating presets over the rating range (board: Any · 6+ · 7+ · 8+ · 9+). */
const RATING_PRESETS = [6, 7, 8, 9] as const;

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

type AccessChoice = "all" | AccessType;

/**
 * SORT & FILTER — one drawer for both the Movies and Series filters
 * (SearchResults board): a 460px panel on the right with 20px left corners on
 * desktop, a bottom sheet with a grabber on phones, 60% black behind it.
 *
 * Header (title, "2 filters applied · Movies", close) and footer (Clear,
 * crimson "Show N results") stay pinned; only the middle scrolls. Every
 * option list is DB-derived (facets). Changes apply as they are made, so the
 * footer count is always the SERVER's total for the exact query on screen —
 * the same number the results header shows — and "Show N results" closes the
 * drawer onto it.
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
  type,
  onTypeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  /** Built once by the surface from t.filters.sort* — relevance is only in the list while a term is active. */
  sortOptions: { value: string; label: string }[];
  /** Series tab: only Sort/Type/Access/Genre/Year/Language render. */
  isSeries?: boolean;
  facets: FilterSheetFacets | undefined;
  activeCount: number;
  /** The backend's total for the current filtered query — the same number the results header shows. */
  resultTotal: number | undefined;
  isCounting?: boolean;
  /** Which catalogue the drawer is filtering; with `onTypeChange` it shows the Movies / Series switch. */
  type?: "movies" | "series";
  onTypeChange?: (type: "movies" | "series") => void;
}) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const ids = useId();

  // The cast picker's live search — the term lives here (it's sheet-local UI
  // state), the request goes through the shared hook.
  const [actorTerm, setActorTerm] = useState("");
  const actorSearch = useActorSearch(actorTerm);
  const actorOptions: MultiSelectOption[] = (actorSearch.data?.items ?? []).map((a) => ({
    id: a.id,
    label: a.name,
  }));

  const accessOptions: SegmentOption<AccessChoice>[] = [
    { value: "all", label: t.filters.accessAll },
    { value: "FREE", label: sx.accessFreeOnly },
    { value: "SUBSCRIPTION", label: t.filters.accessPremium, icon: <CrownIcon size={14} /> },
  ];

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

  const years = facets?.years ?? null;
  const yearLo = Math.max(FIRST_FILM_YEAR, Math.min(years?.min ?? FIRST_FILM_YEAR, CURRENT_YEAR));
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

  const ratingSet = values.ratingMin !== undefined || values.ratingMax !== undefined;
  const yearSet = values.yearFrom !== undefined || values.yearTo !== undefined;
  const kindLabel = type === "series" || isSeries ? t.search.series : t.search.movies;
  const status = activeCount > 0 ? t.filters.activeCount(activeCount) : t.filters.noneApplied;
  const selectedMeta = (n: number) => (n > 0 ? sx.selected(n) : undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // One close button, in our own header row.
        showCloseButton={false}
        className={cn(
          "w-[min(460px,100%)] gap-0 rounded-l-[20px] p-0 text-base sm:max-w-none",
          // Phones: the same panel docks to the bottom as a sheet.
          "max-desk:inset-x-0 max-desk:top-auto max-desk:bottom-0 max-desk:h-auto max-desk:max-h-[88dvh] max-desk:w-full max-desk:rounded-t-[20px] max-desk:rounded-bl-none",
          "max-desk:data-ending-style:translate-x-0 max-desk:data-ending-style:translate-y-10 max-desk:data-starting-style:translate-x-0 max-desk:data-starting-style:translate-y-10",
        )}
      >
        <span aria-hidden className="mx-auto mt-2 block h-[5px] w-10 shrink-0 rounded-[3px] bg-white/24 desk:hidden" />

        <header className="flex shrink-0 items-center justify-between gap-4 pt-5 pr-5 pb-4 pl-6 shadow-[inset_0_-1px_0_var(--mq-hairline)] max-desk:pt-3 max-desk:pr-3 max-desk:pl-4">
          <div className="min-w-0">
            <SheetTitle className="text-section-title text-fg">{sx.sortAndFilter}</SheetTitle>
            <SheetDescription className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">
              {sx.drawerSubtitle(status, kindLabel)}
            </SheetDescription>
          </div>
          <SheetClose
            render={<Button variant="ghost" size="icon-bar" className="shrink-0 bg-tonal-faint hover:bg-tonal-soft" />}
          >
            <CloseIcon size={20} />
            <span className="sr-only">{sx.closeFilters}</span>
          </SheetClose>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto overscroll-contain px-6 pt-5 pb-7 [scrollbar-color:var(--mq-tonal)_transparent] [scrollbar-width:thin] max-desk:px-4">
          <Group id={`${ids}-sort`} label={t.filters.sortBy} plain groupRole="radiogroup">
            {/* Pick-one (board: role=radiogroup) — one tab stop, arrows move and select. */}
            <div className="flex flex-wrap gap-2" onKeyDown={radioArrowKeys}>
              {sortOptions.map((option, index) => {
                const on = values.sort === option.value;
                // One tab stop: the picked sort, or the first when none of them is.
                const tabStop = on || (index === 0 && !sortOptions.some((o) => o.value === values.sort));
                return (
                  <FilterChip
                    key={option.value}
                    role="radio"
                    aria-checked={on}
                    aria-pressed={undefined}
                    tabIndex={tabStop ? 0 : -1}
                    selected={on}
                    onClick={() => onChange({ sort: option.value as FilterState["sort"] })}
                  >
                    {option.label}
                  </FilterChip>
                );
              })}
            </div>
            {values.sort === "mostPurchased" && (
              // HONESTY HINT — this ranking is the frozen pre-subscription
              // purchase table; the label must never imply live popularity.
              <p className="text-[13px] leading-[18px] text-fg-faint">{t.filters.sortMostPurchasedHint}</p>
            )}
          </Group>

          {type && onTypeChange && (
            <Group id={`${ids}-type`} label={sx.type} plain>
              <SegmentedControl
                labelledBy={`${ids}-type`}
                value={type}
                onChange={onTypeChange}
                options={[
                  { value: "movies", label: t.search.movies },
                  { value: "series", label: t.search.series },
                ]}
              />
              <p className="text-[13px] leading-[18px] text-fg-faint">{sx.booksTitleOnly}</p>
            </Group>
          )}

          <Group id={`${ids}-access`} label={t.filters.access} plain>
            {/* Segmented — the three options are mutually exclusive and always all visible. */}
            <SegmentedControl<AccessChoice>
              labelledBy={`${ids}-access`}
              value={values.accessType ?? "all"}
              onChange={(v) => onChange({ accessType: v === "all" ? undefined : v })}
              options={accessOptions}
            />
          </Group>

          {(facets?.genres.length ?? 0) > 0 && (
            <Group
              id={`${ids}-genre`}
              label={t.filters.genre}
              value={selectedMeta(values.genres.length)}
              onClear={() => onChange({ genres: [] })}
            >
              <div className="flex flex-wrap gap-2">
                {facets!.genres.map((facet) => (
                  <FilterChip
                    key={facet.value}
                    check
                    selected={values.genres.includes(facet.value)}
                    onClick={() => onChange({ genres: toggle(values.genres, facet.value) })}
                  >
                    {facet.value}
                  </FilterChip>
                ))}
              </div>
            </Group>
          )}

          {years && (
            <Group
              id={`${ids}-year`}
              label={t.filters.releaseYear}
              value={yearSet ? `${values.yearFrom ?? yearLo}–${values.yearTo ?? yearHi}` : undefined}
              emptyMeta={t.filters.anyYear}
              onClear={() => onChange({ yearFrom: undefined, yearTo: undefined })}
            >
              <div className="flex flex-wrap gap-2">
                {yearPresets.map((preset) => {
                  const active = values.yearFrom === preset.from && values.yearTo === preset.to;
                  return (
                    <FilterChip
                      key={preset.label}
                      selected={active}
                      className="nums"
                      onClick={() =>
                        onChange(
                          active
                            ? { yearFrom: undefined, yearTo: undefined }
                            : { yearFrom: preset.from, yearTo: preset.to },
                        )
                      }
                    >
                      {preset.label}
                    </FilterChip>
                  );
                })}
              </div>
              <YearRangeFields
                idPrefix={ids}
                from={values.yearFrom}
                to={values.yearTo}
                min={yearLo}
                max={yearHi + 1}
                onCommit={(from, to) => onChange({ yearFrom: from, yearTo: to })}
              />
            </Group>
          )}

          {(facets?.languages.length ?? 0) > 0 && (
            <Group
              id={`${ids}-language`}
              label={t.filters.language}
              value={selectedMeta(values.languages.length)}
              onClear={() => onChange({ languages: [] })}
            >
              <div className="flex flex-wrap gap-2">
                {facets!.languages.map((facet) => (
                  <FilterChip
                    key={facet.value}
                    check
                    selected={values.languages.includes(facet.value)}
                    onClick={() => onChange({ languages: toggle(values.languages, facet.value) })}
                  >
                    {facet.value}
                  </FilterChip>
                ))}
              </div>
            </Group>
          )}

          {!isSeries && (facets?.ageRatings?.length ?? 0) > 0 && (
            <Group
              id={`${ids}-age`}
              label={t.filters.ageRating}
              value={selectedMeta(values.ageRatings.length)}
              onClear={() => onChange({ ageRatings: [] })}
            >
              <div className="flex flex-wrap gap-2">
                {facets!.ageRatings!.map((facet) => {
                  const rating = facet.value as AgeRating;
                  return (
                    <FilterChip
                      key={facet.value}
                      check
                      selected={values.ageRatings.includes(rating)}
                      onClick={() => onChange({ ageRatings: toggle(values.ageRatings, rating) })}
                    >
                      {AGE_RATING_LABELS[rating] ?? facet.value}
                    </FilterChip>
                  );
                })}
              </div>
            </Group>
          )}

          {!isSeries && (
            <Group
              id={`${ids}-rating`}
              label={t.filters.rating}
              value={ratingSet ? `${values.ratingMin ?? 0}–${values.ratingMax ?? 10}` : undefined}
              onClear={() => onChange({ ratingMin: undefined, ratingMax: undefined })}
            >
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  selected={!ratingSet}
                  onClick={() => onChange({ ratingMin: undefined, ratingMax: undefined })}
                >
                  {t.filters.anyRating}
                </FilterChip>
                {RATING_PRESETS.map((min) => (
                  <FilterChip
                    key={min}
                    selected={values.ratingMin === min && values.ratingMax === undefined}
                    className="nums"
                    onClick={() => onChange({ ratingMin: min, ratingMax: undefined })}
                  >
                    <StarIcon size={14} className="text-gold" />
                    {t.filters.ratingPlus(min)}
                  </FilterChip>
                ))}
              </div>
              {/* Fine-tuning, including an upper bound: the chips are presets over this range. */}
              <RangeSlider
                min={0}
                max={10}
                step={0.5}
                lo={values.ratingMin}
                hi={values.ratingMax}
                format={(v) => String(v)}
                anyLabel={t.filters.anyRating}
                label={t.filters.rating}
                onCommit={(lo, hi) => onChange({ ratingMin: lo, ratingMax: hi })}
              />
            </Group>
          )}

          {!isSeries && (
            <Group
              id={`${ids}-duration`}
              label={t.filters.duration}
              value={durationBucket !== "any" ? durationLabel(values, t.filters) : undefined}
              onClear={() => {
                setCustomPressed(false);
                onChange({ durationMin: undefined, durationMax: undefined });
              }}
            >
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  selected={durationBucket === "any" && !customPressed}
                  onClick={() => {
                    setCustomPressed(false);
                    onChange({ durationMin: undefined, durationMax: undefined });
                  }}
                >
                  {t.filters.all}
                </FilterChip>
                <FilterChip
                  selected={durationBucket === "short"}
                  onClick={() => {
                    setCustomPressed(false);
                    onChange({ durationMin: undefined, durationMax: 90 });
                  }}
                >
                  {t.filters.durationShort}
                </FilterChip>
                <FilterChip
                  selected={durationBucket === "medium"}
                  onClick={() => {
                    setCustomPressed(false);
                    onChange({ durationMin: 91, durationMax: 120 });
                  }}
                >
                  {t.filters.durationMedium}
                </FilterChip>
                <FilterChip
                  selected={durationBucket === "long"}
                  onClick={() => {
                    setCustomPressed(false);
                    onChange({ durationMin: 121, durationMax: undefined });
                  }}
                >
                  {t.filters.durationLong}
                </FilterChip>
                <FilterChip selected={durationCustomOpen} onClick={() => setCustomPressed(true)}>
                  {t.filters.durationCustom}
                </FilterChip>
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
                  format={(v, edge) => (edge === "hi" && v === DURATION_SLIDER_MAX ? "∞" : `${v}m`)}
                  label={t.filters.duration}
                  onCommit={(lo, hi) => onChange({ durationMin: lo, durationMax: hi })}
                />
              )}
            </Group>
          )}

          {!isSeries && (
            <Group
              id={`${ids}-actor`}
              label={t.filters.actor}
              labelFor={`${ids}-actor-input`}
              value={selectedMeta(values.actors.length)}
              onClear={() => onChange({ actors: [] })}
            >
              <SearchableMultiSelect
                inputId={`${ids}-actor-input`}
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

          {!isSeries &&
            ((facets?.directors?.length ?? 0) > 0 || (facets?.countries?.length ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-3 max-desk:grid-cols-1 max-desk:gap-7">
                {(facets?.directors?.length ?? 0) > 0 && (
                  <Group
                    id={`${ids}-director`}
                    label={t.filters.director}
                    labelFor={`${ids}-director-input`}
                    value={selectedMeta(values.directors.length)}
                    onClear={() => onChange({ directors: [] })}
                  >
                    <SearchableMultiSelect
                      inputId={`${ids}-director-input`}
                      options={facets!.directors!.map((f) => ({ id: f.value, label: f.value }))}
                      value={values.directors.map((d) => ({ id: d, label: d }))}
                      onChange={(next) => onChange({ directors: next.map((o) => o.id) })}
                      placeholder={sx.any}
                    />
                  </Group>
                )}
                {(facets?.countries?.length ?? 0) > 0 && (
                  <Group
                    id={`${ids}-country`}
                    label={t.filters.country}
                    labelFor={`${ids}-country-input`}
                    value={selectedMeta(values.countries.length)}
                    onClear={() => onChange({ countries: [] })}
                  >
                    <SearchableMultiSelect
                      inputId={`${ids}-country-input`}
                      options={facets!.countries!.map((f) => ({ id: f.value, label: f.value }))}
                      value={values.countries.map((c) => ({ id: c, label: c }))}
                      onChange={(next) => onChange({ countries: next.map((o) => o.id) })}
                      placeholder={sx.any}
                    />
                  </Group>
                )}
              </div>
            )}
        </div>

        {/* The pinned footer pads itself past the bottom inset so the primary
            button never sits under a gesture-nav home indicator. */}
        <footer className="flex shrink-0 gap-3 px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--mq-hairline)] max-desk:px-4">
          <Button variant="tonal" size="cta" className="h-[52px] shrink-0 px-[22px]" onClick={onClear} disabled={activeCount === 0}>
            {sx.clear}
          </Button>
          <Button
            variant="commit"
            size="cta"
            className="h-[52px] min-w-0 flex-1 px-[22px] whitespace-nowrap nums"
            onClick={() => onOpenChange(false)}
          >
            {/* The SERVER's total for this exact query — the one honest number,
                shared with the results header. Dots while it's in flight,
                never a stale or page-local count. */}
            {isCounting || resultTotal === undefined ? (
              <>
                <BusyDots />
                <span className="sr-only">{sx.countingResults}</span>
              </>
            ) : resultTotal === 0 ? (
              sx.noResults
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
 * From / To year fields (board). Typing updates local text only; the filter
 * (and therefore the query) updates when a field is left or Enter is
 * pressed. Values clamp into the catalogue's range and a reversed pair is
 * swapped; an empty field means "no bound".
 */
function YearRangeFields({
  idPrefix,
  from,
  to,
  min,
  max,
  onCommit,
}: {
  idPrefix: string;
  from: number | undefined;
  to: number | undefined;
  min: number;
  max: number;
  onCommit: (from: number | undefined, to: number | undefined) => void;
}) {
  const sx = useSection(searchText);
  const appliedKey = `${from ?? ""}:${to ?? ""}`;
  const [draft, setDraft] = useState({ from: from ? String(from) : "", to: to ? String(to) : "" });
  // Re-sync when the applied filter changes from outside (presets, pills, clear all).
  const [seenKey, setSeenKey] = useState(appliedKey);
  if (appliedKey !== seenKey) {
    setSeenKey(appliedKey);
    setDraft({ from: from ? String(from) : "", to: to ? String(to) : "" });
  }

  const parse = (text: string): number | undefined => {
    const n = Number.parseInt(text.trim(), 10);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(max, Math.max(min, n));
  };

  const commit = () => {
    let nextFrom = parse(draft.from);
    let nextTo = parse(draft.to);
    if (nextFrom !== undefined && nextTo !== undefined && nextFrom > nextTo) {
      [nextFrom, nextTo] = [nextTo, nextFrom];
    }
    setDraft({ from: nextFrom ? String(nextFrom) : "", to: nextTo ? String(nextTo) : "" });
    if (nextFrom !== from || nextTo !== to) onCommit(nextFrom, nextTo);
  };

  const field = (key: "from" | "to", label: string) => (
    <div className="min-w-0">
      <label htmlFor={`${idPrefix}-year-${key}`} className="block text-[13px] leading-[18px] font-bold text-fg-muted">
        {label}
      </label>
      <input
        id={`${idPrefix}-year-${key}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        placeholder={sx.any}
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className={cn(fieldClass(), "mt-2 nums")}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {field("from", sx.yearFrom)}
      {field("to", sx.yearTo)}
    </div>
  );
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
  label,
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
  /** Accessible name of the slider. */
  label: string;
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
        aria-label={label}
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
      <div className="flex items-center justify-between text-[13px] leading-[18px] text-fg-faint nums">
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

/**
 * One drawer section: a 13/18 bold muted label, and on the right either what
 * is picked (a crimson "2 selected ×" that clears the section) or a faint
 * "Any". `plain` sections (sort-like single choices) show neither.
 */
function Group({
  id,
  label,
  labelFor,
  value,
  emptyMeta,
  onClear,
  plain = false,
  groupRole = "group",
  children,
}: {
  id: string;
  label: string;
  /** "radiogroup" when the section is one pick-one list (Sort by). */
  groupRole?: "group" | "radiogroup";
  /** When the section is one labelled field, its label points at that input. */
  labelFor?: string;
  /** When set, the section shows what's picked and offers a one-tap reset. */
  value?: string;
  /** The faint text shown while nothing is picked (default "Any"). */
  emptyMeta?: string;
  onClear?: () => void;
  plain?: boolean;
  children: ReactNode;
}) {
  const sx = useSection(searchText);
  const labelClass = "text-[13px] leading-[18px] font-bold text-fg-muted";
  return (
    <section role={labelFor ? undefined : groupRole} aria-labelledby={labelFor ? undefined : id} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        {labelFor ? (
          <label id={id} htmlFor={labelFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <div id={id} className={labelClass}>
            {label}
          </div>
        )}
        {!plain &&
          (value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              aria-label={sx.clearGroup(label)}
              className="mq-link inline-flex cursor-pointer items-center gap-1 rounded-[6px] border-0 bg-transparent p-0 text-[13px] leading-[18px] outline-none nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {value}
              <CloseIcon size={12} strokeWidth={2.2} />
            </button>
          ) : (
            <span className="text-[13px] leading-[18px] text-fg-faint">{emptyMeta ?? sx.any}</span>
          ))}
      </div>
      {children}
    </section>
  );
}

/**
 * The WAI-ARIA radio pattern for a row of role="radio" chips: ←/↑ and →/↓
 * move to the previous/next option AND pick it (wrapping), Home/End jump to
 * the ends. Clicking the focused radio runs its own onClick.
 */
function radioArrowKeys(event: KeyboardEvent<HTMLElement>) {
  const step =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : event.key === "Home" || event.key === "End"
          ? 0
          : null;
  if (step === null) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  if (radios.length === 0) return;
  event.preventDefault();
  const current = radios.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? radios.length - 1
        : (Math.max(current, 0) + step + radios.length) % radios.length;
  radios[next].focus();
  radios[next].click();
}
