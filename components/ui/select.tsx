"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group/trigger flex w-fit items-center justify-between gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 pr-2 pl-3 text-sm whitespace-nowrap transition-colors duration-200 ease-out outline-none select-none hover:border-white/16 hover:bg-white/8 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-popup-open:border-white/16 data-popup-open:bg-white/10 h-10 data-[size=sm]:h-8 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {/* The chevron points at the menu it opened — the one piece of state the
          closed trigger can't otherwise show. */}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground transition-transform duration-200 ease-out group-data-popup-open/trigger:rotate-180" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

/**
 * THE MENU.
 *
 * It used to open *over* its own trigger: base-ui's `alignItemWithTrigger`
 * stacks the list so the selected row lands exactly on the button, native-macOS
 * style. On a floating toolbar of pills that reads as a bug — the control you
 * just pressed disappears under a slab that also covers its neighbours, and the
 * mode also kills the open animation outright (`data-[side=none]` has to
 * switch it off). Now the menu drops *below* the trigger, so the thing being
 * changed stays on screen while you change it, and it can animate in.
 *
 * Width follows content between two bounds instead of copying the trigger:
 * these triggers are compact pills, and a 99px-wide menu of genre names is a
 * column of ellipses. The floor is only there to stop that — it sits just under
 * the widest label so content, not the floor, sets the width.
 */
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "isolate z-50 flex max-h-[min(20rem,var(--available-height))] w-fit flex-col overflow-hidden max-w-[min(20rem,var(--available-width))] min-w-[max(var(--anchor-width),9rem)] origin-(--transform-origin) rounded-2xl bg-popover/95 p-1.5 text-popover-foreground shadow-e2 ring-1 ring-white/10 backdrop-blur-2xl ring-inset transition-[opacity,scale,translate] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none data-[side=none]:data-ending-style:transition-none",
            className
          )}
          {...props}
        >
          {/* The list is the scroller, not the popup: that keeps the popup's
              padding and rounded corners fixed while rows move under them.
              `min-h-0` is what lets a flex child actually shrink and scroll.

              No scroll arrows. base-ui hides the list's native scrollbar for as
              long as a ScrollArrow is *mounted* (SelectList appends
              `base-ui-disable-scrollbar`), and the arrows are absolutely
              positioned, pointer-interactive overlays — at 28px over a 36px row
              they ate the first and last row's clicks and auto-scrolled the
              list out from under the cursor. They belong to the
              `alignItemWithTrigger` idiom this menu no longer uses; a thin
              scrollbar is the affordance now, same as every other menu here. */}
          <SelectPrimitive.List className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

/**
 * A row is a 36px target with its own rounded highlight, not a line of text in
 * a list. Selection is carried by a violet wash *and* a check, because the
 * check alone (a thin grey tick at the far edge) was doing all the work.
 * `data-highlighted` is base-ui's hook for both hover and keyboard — the old
 * `focus:` styling was a Radix idiom that only landed by accident.
 */
function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-9 w-full shrink-0 cursor-pointer scroll-my-1 items-center gap-2 rounded-xl px-2.5 py-1 text-sm text-muted-foreground outline-hidden transition-colors duration-100 ease-out select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-white/8 data-highlighted:text-foreground data-[selected]:bg-primary/25 data-[selected]:font-medium data-[selected]:text-foreground data-[selected]:data-highlighted:bg-primary/35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {/* Block, not flex: `text-overflow` is ignored on a flex container, so
          `truncate` there hard-cuts a long label mid-glyph instead of
          ellipsising it. The `py-1` is not spacing — it is clip room. The text
          box is a 20px line box and Burmese ink runs ~22px, so an unpadded
          `overflow-hidden` shears the tail off every stacked consonant; the
          padding moves the clip edge clear of the ink without growing the row
          (4 + 20 + 4 + the row's own py-1 = the 36px `min-h-9` asks for). */}
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate py-1 leading-5">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="pointer-events-none flex size-4 shrink-0 items-center justify-center" />}
      >
        <CheckIcon className="pointer-events-none size-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none my-1 h-px shrink-0 bg-white/8", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
