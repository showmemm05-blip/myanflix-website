"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/**
 * MARQUEE SWITCH: 52×32, radius 16. On = crimson, off = raised #1C1C23,
 * a 26px white knob. `size="sm"` keeps a compact 38×22 for dense lists.
 * Give it a name: aria-label, or aria-labelledby pointing at its label.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors duration-150 outline-none after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link data-[size=default]:h-8 data-[size=default]:w-[52px] data-[size=sm]:h-[22px] data-[size=sm]:w-[38px] data-checked:bg-crimson data-unchecked:bg-raised data-unchecked:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white transition-transform duration-150 group-data-[size=default]/switch:size-[26px] group-data-[size=sm]/switch:size-[18px] group-data-[size=default]/switch:data-unchecked:translate-x-[3px] group-data-[size=default]/switch:data-checked:translate-x-[23px] group-data-[size=sm]/switch:data-unchecked:translate-x-[2px] group-data-[size=sm]/switch:data-checked:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
