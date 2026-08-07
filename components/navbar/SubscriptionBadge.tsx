"use client";

import { Crown } from "lucide-react";
import { useSubscription } from "@/lib/context/subscription-context";
import { cn } from "@/lib/utils";

/** Compact pill next to WalletBalance — active status + expiry, or a nudge to subscribe. */
export function SubscriptionBadge({ className }: { className?: string }) {
  const { isSubscribed, expiresAt } = useSubscription();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold sm:text-sm",
        isSubscribed
          ? "border-primary/30 bg-primary/15 text-primary"
          : "border-white/10 bg-secondary/40 text-muted-foreground",
        className,
      )}
    >
      <Crown className="size-3.5 shrink-0 sm:size-4" />
      <span className="hidden sm:inline">
        {isSubscribed && expiresAt
          ? `Premium · exp. ${new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Not subscribed"}
      </span>
    </div>
  );
}
