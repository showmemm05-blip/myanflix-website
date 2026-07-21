import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingBadge({ rating, className }: { rating: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm",
        className,
      )}
    >
      <Star className="size-3 fill-warning text-warning" />
      {rating.toFixed(1)}
    </div>
  );
}
