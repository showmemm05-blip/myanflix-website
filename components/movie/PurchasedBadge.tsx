import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PurchasedBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm",
        className,
      )}
    >
      <CheckCircle2 className="size-3" />
      Owned
    </div>
  );
}
