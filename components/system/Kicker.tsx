import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The eyebrow label — the signature editorial device of Aurora Theater. It sits
 * above hero titles and section titles and tells you what *kind* of thing you
 * are looking at before the title tells you which one.
 *
 * `tone` tints it when the section carries a semantic role (finance, premium…);
 * the default muted grey is right for almost everything.
 */
const TONE: Record<string, string> = {
  muted: "text-muted-foreground",
  primary: "text-primary",
  premium: "text-premium",
  finance: "text-finance",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function Kicker({
  tone = "muted",
  className,
  children,
  ...props
}: React.ComponentProps<"p"> & { tone?: keyof typeof TONE }) {
  return (
    <p data-slot="kicker" className={cn("text-kicker", TONE[tone], className)} {...props}>
      {children}
    </p>
  );
}
