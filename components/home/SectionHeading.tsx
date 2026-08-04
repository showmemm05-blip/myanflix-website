import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 sm:px-6 lg:px-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</span>
          )}
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{title}</h2>
        </div>
        {action}
      </div>
      {subtitle && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
    </div>
  );
}
