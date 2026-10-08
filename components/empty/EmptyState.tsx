import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * MARQUEE EMPTY STATE (SHELL.md §16): a 64px disc (8% white) with a 28px
 * muted icon, a 22/28 · 800 title, a 15/23 muted line (max 360px) and at
 * most one way out — usually a white button (`<Button variant="play" size="cta">`).
 *
 * `framed` puts it on a surface panel (radius 16) for use inside a page
 * section; by default it sits straight on the ground.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  framed = false,
  tone = "neutral",
  headingLevel = "h3",
  className,
}: {
  icon: ComponentType<{ className?: string; size?: number }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  framed?: boolean;
  /** "danger" = the error look (red disc and icon). */
  tone?: "neutral" | "danger";
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-14 text-center",
        framed && "rounded-[16px] bg-surface px-7 py-10",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-full",
          tone === "danger" ? "bg-danger/14 text-danger" : "bg-tonal-faint text-fg-muted",
        )}
      >
        <Icon size={28} className="size-7" />
      </span>
      <Heading className="mt-[18px] text-section-title text-fg">{title}</Heading>
      {description && <p className="mt-1.5 max-w-[360px] text-[15px] leading-[23px] text-fg-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
