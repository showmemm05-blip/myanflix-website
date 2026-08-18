"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Check, Info, Loader2, TriangleAlert, X } from "lucide-react";

/**
 * THE SLATE — MyanFlix's notification.
 *
 * Not a rounded rectangle in a corner. It is built from the language of the
 * thing this product actually is: a broadcast lower-third. A flat accent SPINE
 * runs down the left edge (square there, rounded on the right, so the
 * silhouette is asymmetric and reads as "clipped on" rather than "floating"),
 * the icon sits in a tinted slate rather than a circle, and the lifetime of the
 * message drains along the bottom edge like a playhead running out — pausing
 * the moment you point at it, exactly as the timer itself does.
 *
 * It enters from the TOP CENTRE: the bottom of the screen belongs to the tab
 * bar on a phone and to the player's controls on every device, and a toast
 * must never land on either. On a phone it clears the top bar; on desktop it
 * sits just under the top edge, nudged right so it centres over the content
 * column rather than the rail.
 *
 * All visual treatment lives in the `.mf-toast` component class in globals.css
 * (spine, drain, glow, per-state accents) — keyed off the `data-type` Sonner
 * already writes, so success/error/warning/info are one CSS variable apart and
 * every existing `toast.*` call keeps working untouched.
 */
const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      // Dark is the product; letting the OS flip this would hand us a white
      // slab on a black page.
      theme="dark"
      position="top-center"
      // Clears the mobile top bar (56px) — desktop has no bar to clear.
      offset={{ top: "16px" }}
      mobileOffset={{ top: "68px", left: "12px", right: "12px" }}
      duration={TOAST_DURATION_MS}
      visibleToasts={3}
      gap={10}
      closeButton
      icons={{
        success: <Check className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <X className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={{ "--width": "400px" } as React.CSSProperties}
      toastOptions={{ className: "mf-toast" }}
      {...props}
    />
  );
};

/**
 * Kept in lockstep with `--mf-toast-duration` in globals.css: the drain bar is
 * a CSS animation, so it can only tell the truth if it runs for exactly as long
 * as Sonner's timer.
 */
const TOAST_DURATION_MS = 4500;

export { Toaster };
