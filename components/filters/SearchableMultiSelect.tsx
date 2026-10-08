"use client";

import { useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, CloseIcon, SearchIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
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
 * Marquee field look: 52px, radius 12, raised fill, crimson inner ring on
 * focus. Selections render as removable crimson-soft chips inside the field,
 * the same idiom as the applied-filter pills; the list is a popover slab.
 */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  onSearch,
  isLoading = false,
  inputId,
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
  /** The text input's id, so a <label htmlFor> outside can name it. */
  inputId?: string;
}) {
  const { t } = useLanguage();
  const s = useSection(shellText);
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
      <Combobox.InputGroup className="flex min-h-[52px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-[12px] bg-raised py-2 pr-3 pl-4 transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]">
        <SearchIcon
          size={18}
          aria-hidden
          className={cn("shrink-0", isLoading ? "animate-pulse text-link" : "text-fg-faint")}
        />
        <Combobox.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Combobox.Value>
            {(selected: MultiSelectOption[]) => (
              <>
                {selected.map((option) => (
                  <Combobox.Chip
                    key={option.id}
                    aria-label={option.label}
                    className="flex h-7 items-center gap-1 rounded-full bg-crimson-soft py-0 pr-1 pl-2.5 text-[13px] font-bold text-fg"
                  >
                    {option.label}
                    <Combobox.ChipRemove
                      aria-label={s.removeFilter(option.label)}
                      className="flex size-5 cursor-pointer items-center justify-center rounded-full text-link outline-none transition-colors duration-150 hover:bg-crimson/24 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-link"
                    >
                      <CloseIcon size={12} strokeWidth={2.2} />
                    </Combobox.ChipRemove>
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  id={inputId}
                  placeholder={selected.length > 0 ? "" : placeholder}
                  className="h-8 min-w-16 flex-1 border-0 bg-transparent p-0 text-base text-fg outline-none placeholder:text-fg-faint"
                />
              </>
            )}
          </Combobox.Value>
        </Combobox.Chips>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-[85] outline-none" sideOffset={6}>
          <Combobox.Popup
            className={cn(
              "max-h-[min(var(--available-height),18rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-[16px] bg-popover p-1.5 text-fg shadow-e2",
              "transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            )}
          >
            <Combobox.Empty className="px-3 py-2 text-sm text-fg-faint empty:hidden">
              {t.filters.noOptions}
            </Combobox.Empty>
            <Combobox.List>
              {(option: MultiSelectOption) => (
                <Combobox.Item
                  key={option.id}
                  value={option}
                  className="grid min-h-11 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-[10px] px-3 py-2 text-[15px] text-fg-body outline-none select-none data-highlighted:bg-tonal-ghost data-highlighted:text-fg data-selected:font-bold data-selected:text-fg"
                >
                  <Combobox.ItemIndicator className="col-start-1 text-link">
                    <CheckIcon size={16} />
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
