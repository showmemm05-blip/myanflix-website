import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessType } from "@/types/movie";

/** Driven purely by the item's own accessType — not the viewer's subscription state. */
export function AccessBadge({ accessType, className }: { accessType: AccessType; className?: string }) {
  if (accessType === "FREE") {
    return (
      <div
        className={cn(
          "rounded-md bg-success/90 px-1.5 py-0.5 text-xs font-semibold text-black backdrop-blur-sm",
          className,
        )}
      >
        Free
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm",
        className,
      )}
    >
      <Crown className="size-3" />
      Premium
    </div>
  );
}
