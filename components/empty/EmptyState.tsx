import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";
import { Surface } from "@/components/system/Surface";
import { cn } from "@/lib/utils";

/**
 * "There is nothing here" is a screen state, not an error — so it gets the
 * warm treatment: a contained aurora blush behind an icon disc, the message,
 * and whatever single action gets the user out of the dead end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Surface
      tone="subtle"
      className={cn(
        "isolate flex flex-col items-center justify-center gap-4 overflow-hidden px-6 py-16 text-center",
        className,
      )}
    >
      <AuroraBackdrop variant="panel" className="opacity-60" />
      <div className="flex size-14 items-center justify-center rounded-full bg-white/6 text-muted-foreground ring-1 ring-white/10 backdrop-blur-md ring-inset">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold tracking-tight">{title}</p>
        {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </Surface>
  );
}
