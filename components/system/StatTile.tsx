import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Surface } from "./Surface";

/**
 * Label · big number · icon disc. The unit the wallet and profile pages are
 * built out of.
 *
 * The number is always `tabular-nums` — a balance that shifts sideways as it
 * updates reads as jitter, and this component exists precisely where values
 * change under the user (socket-driven balances, counts).
 */
const TONES = {
  neutral: { text: "text-foreground", disc: "bg-white/8 text-muted-foreground ring-white/12" },
  primary: { text: "text-foreground", disc: "bg-primary/15 text-primary ring-primary/25" },
  premium: { text: "text-premium", disc: "bg-premium/15 text-premium ring-premium/25" },
  finance: { text: "text-finance", disc: "bg-finance/15 text-finance ring-finance/25" },
  success: { text: "text-success", disc: "bg-success/15 text-success ring-success/25" },
  warning: { text: "text-warning", disc: "bg-warning/15 text-warning ring-warning/25" },
  destructive: { text: "text-destructive", disc: "bg-destructive/15 text-destructive ring-destructive/25" },
  info: { text: "text-info", disc: "bg-info/15 text-info ring-info/25" },
} as const;

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  className,
  ...props
  // `tone` here is the semantic role of the *number* (finance, premium…), not
  // the Surface's fill — the panel underneath is always the standard glass.
}: Omit<React.ComponentProps<typeof Surface>, "children" | "tone"> & {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <Surface className={cn("flex items-start gap-3.5 p-4 sm:p-5", className)} {...props}>
      {Icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
            t.disc,
          )}
        >
          <Icon className="size-4.5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-kicker">{label}</p>
        <p className={cn("mt-1 font-heading text-xl font-bold tracking-tight nums sm:text-2xl", t.text)}>
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Surface>
  );
}
