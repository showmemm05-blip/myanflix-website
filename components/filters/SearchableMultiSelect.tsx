"use client";

import { useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, LoaderCircle, Search, X } from "lucide-react";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

/**
 * A searchable multi-select on base-ui's Combobox (`multiple`) — used for the
 * cast picker (async: the parent feeds `options` from a live search and gets
 * keystrokes back through `onSearch`) and for directors/countries (static
 * facet lists filtered locally by the combobox itself).
 *
 * Selections render as removable chips inside the field, exactly like the
 * ActiveFilterPills idiom: violet = something the user picked.
 */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  onSearch,
  isLoading = false,
}: {
  /** The offerable options — the full facet list (static) or the current search results (async). */
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (next: MultiSelectOption[]) => void;
  placeholder: string;
  /**
   * Async mode: called with every keystroke so the parent can run the remote
   * search that produces `options`. When omitted the combobox filters the
   * static `options` itself.
   */
  onSearch?: (term: string) => void;
  /** Async mode: a search is in flight — the field's glyph spins. */
  isLoading?: boolean;
}) {
  const { t } = useLanguage();
  const isAsync = Boolean(onSearch);

  // Selected values must stay resolvable as items even when the current
  // search results don't contain them (async), or the list would drop their
  // chips' semantics. Merge, selected first, de-duplicated by id.
  const items = useMemo(() => {
    const seen = new Set(value.map((v) => v.id));
    return [...value, ...options.filter((o) => !seen.has(o.id))];
  }, [value, options]);

  return (
    <Combobox.Root
      items={items}
      multiple
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(o: MultiSelectOption) => o.label}
      isItemEqualToValue={(a: MultiSelectOption, b: MultiSelectOption) => a.id === b.id}
      // Async results are already filtered by the server — filtering them
      // again locally would fight partial matches the server chose to return.
      filter={isAsync ? null : undefined}
      onInputValueChange={(next, { reason }) => {
        if (!onSearch) return;
        // Picking an item clears the input; that's not a new search.
        if (reason === "item-press") return;
        onSearch(next);
      }}
    >
      <Combobox.InputGroup className="flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10 ring-inset transition-colors duration-150 ease-out focus-within:ring-white/25 hover:bg-white/8">
        {isLoading ? (
          <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        )}
        <Combobox.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Combobox.Value>
            {(selected: MultiSelectOption[]) => (
              <>
                {selected.map((option) => (
                  <Combobox.Chip
                    key={option.id}
                    aria-label={option.label}
                    className="flex h-7 items-center gap-1 rounded-full bg-primary/15 py-0 pr-1 pl-2.5 text-xs font-medium text-primary ring-1 ring-primary/25 ring-inset"
                  >
                    {option.label}
                    <Combobox.ChipRemove
                      aria-label={`${t.watchlist.remove}: ${option.label}`}
                      className="focus-ring flex size-5 items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-primary/25"
                    >
                      <X className="size-3" />
                    </Combobox.ChipRemove>
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  placeholder={selected.length > 0 ? "" : placeholder}
                  className="h-7 min-w-16 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </>
            )}
          </Combobox.Value>
        </Combobox.Chips>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-[70] outline-none" sideOffset={6}>
          <Combobox.Popup
            className={cn(
              "max-h-[min(var(--available-height),18rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-popover py-1.5 text-popover-foreground shadow-e2",
              "transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            )}
          >
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
              {t.filters.noOptions}
            </Combobox.Empty>
            <Combobox.List>
              {(option: MultiSelectOption) => (
                <Combobox.Item
                  key={option.id}
                  value={option}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 text-sm outline-none select-none data-highlighted:bg-white/8 data-selected:text-primary"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 truncate">{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
