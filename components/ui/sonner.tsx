"use client";

import { usePathname } from "next/navigation";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Loader2 } from "lucide-react";

import { AlertCircleIcon, CheckIcon, CloseIcon, InfoIcon } from "@/components/system/icons";
import { isAuthRoute, isImmersiveRoute } from "@/components/system/nav";

/**
 * MARQUEE TOAST (DesignSystem "Toasts", SHELL.md §16).
 *
 * Bottom centre, 24px up, at most 440px wide, 4 seconds. A popover slab
 * (#16161C, radius 12, hairline ring) with a coloured icon — green tick for
 * success, danger for errors, amber for warnings, blue for info — a 14/20
 * message, and an optional crimson-text action ("Undo").
 *
 * Two exceptions, decided per route:
 * - The full-screen player and the reader have their own controls along the
 *   bottom edge, and a toast must never land on them: there it enters from
 *   the TOP centre instead (16px down — those routes have no top bar).
 * - On phones it lifts above the floating dock — but only on pages that
 *   actually show the dock (not the sign-in pages, not the player). The lift
 *   is the `.mf-toaster-dock` rule in globals.css.
 *
 * Every existing `toast.success/error/info/warning(...)` call keeps working
 * untouched; the look lives in the `.mf-toast` rules in globals.css.
 */
const Toaster = (props: ToasterProps) => {
  const pathname = usePathname() ?? "/";
  const immersive = isImmersiveRoute(pathname);
  const hasDock = !immersive && !isAuthRoute(pathname);

  return (
    <Sonner
      theme="dark"
      position={immersive ? "top-center" : "bottom-center"}
      offset={immersive ? { top: "16px" } : { bottom: "24px" }}
      mobileOffset={
        immersive
          ? { top: "16px", left: "16px", right: "16px" }
          : { bottom: "24px", left: "16px", right: "16px" }
      }
      className={hasDock ? "mf-toaster-dock" : undefined}
      duration={TOAST_DURATION_MS}
      visibleToasts={3}
      gap={10}
      closeButton
      icons={{
        success: <CheckIcon size={20} />,
        info: <InfoIcon size={20} />,
        warning: <AlertCircleIcon size={20} />,
        error: <AlertCircleIcon size={20} />,
        loading: <Loader2 className="size-5 animate-spin" />,
        close: <CloseIcon size={16} />,
      }}
      style={{ "--width": "min(440px, calc(100vw - 32px))" } as React.CSSProperties}
      toastOptions={{ className: "mf-toast" }}
      {...props}
    />
  );
};

const TOAST_DURATION_MS = 4000;

export { Toaster };
