import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The overline (12/16 · 800 · 0.12em · uppercase · faint). Latin only gets
 * the tracking: Burmese is never letter-spaced (the :lang(my) rule in
 * globals.css, plus the check below for a Burmese string on an English page).
 */
const TONE: Record<string, string> = {
  muted: "text-fg-faint",
  primary: "text-link",
  premium: "text-gold",
  finance: "text-money",
  info: "text-info",
  success: "text-money",
  warning: "text-pending",
  destructive: "text-danger",
};

const MYANMAR = /[က-႟ꧠ-꧿ꩠ-ꩿ]/;

export function Kicker({
  tone = "muted",
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"p"> & { tone?: keyof typeof TONE }) {
  return (
    <p
      data-slot="kicker"
      className={cn("text-kicker", TONE[tone], className)}
      style={typeof children === "string" && MYANMAR.test(children) ? { ...style, letterSpacing: 0 } : style}
      {...props}
    >
      {children}
    </p>
  );
}
