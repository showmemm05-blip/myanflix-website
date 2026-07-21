import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function PriceBadge({ price, className }: { price: number; className?: string }) {
  if (price === 0) {
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
        "rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm",
        className,
      )}
    >
      {formatKyat(price)}
    </div>
  );
}
