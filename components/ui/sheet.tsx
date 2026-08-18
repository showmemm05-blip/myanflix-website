"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/55 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * Per-side geometry. Kept as plain (unprefixed) utilities selected in JS rather
 * than `data-[side=…]:` variants so that a caller's `className` can actually
 * win: tailwind-merge only drops a conflicting class when both sides carry the
 * same variant prefix, which is why a sheet asking for `sm:max-w-md` used to
 * lose to the primitive's `data-[side=right]:sm:max-w-sm`.
 */
const SHEET_SIDES = {
  top: "inset-x-0 top-0 h-auto border-b data-ending-style:-translate-y-10 data-starting-style:-translate-y-10",
  bottom:
    "inset-x-0 bottom-0 h-auto border-t data-ending-style:translate-y-10 data-starting-style:translate-y-10",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-ending-style:-translate-x-10 data-starting-style:-translate-x-10",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-ending-style:translate-x-10 data-starting-style:translate-x-10",
} as const

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: keyof typeof SHEET_SIDES
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover/95 bg-clip-padding text-sm text-popover-foreground shadow-e3 backdrop-blur-xl transition duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
          SHEET_SIDES[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                // 40px of hit area for a control that is often the only way
                // back out of a full-height sheet on a phone.
                className="absolute top-2 right-2 size-10 rounded-full"
                size="icon-lg"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
