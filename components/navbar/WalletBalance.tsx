"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paymentService } from "@/services/api/paymentService";
import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "myanflix-wallet-balance-hidden";
const MASK = "••••••";

/**
 * Live balance pill for the navbar. Reads the same ["wallet-summary"] query
 * the /wallet page uses, so it picks up the existing socket-driven
 * `wallet.balanceUpdated` cache patch (see useRealtimeWallet, mounted once
 * in the (protected) layout that already wraps every page rendering this)
 * with no extra realtime plumbing of its own.
 */
export function WalletBalance({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { data: summary } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });

  // Starts visible on both server and client render, then syncs to whatever
  // was previously chosen once mounted — avoids a hydration mismatch from
  // reading localStorage during the initial render (matches language-context).
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "true") setHidden(true);
  }, []);

  const toggleHidden = () => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-white/10 bg-secondary/40 px-2.5 py-1.5",
        className,
      )}
    >
      <Wallet className="size-3.5 shrink-0 text-primary sm:size-4" />
      <span
        key={hidden ? "hidden" : String(summary?.balance ?? "loading")}
        className="animate-in fade-in-0 slide-in-from-bottom-1 text-xs font-semibold tabular-nums duration-200 sm:text-sm"
      >
        {hidden ? MASK : summary ? formatKyat(summary.balance) : "–"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={toggleHidden}
        aria-label={hidden ? t.nav.showBalance : t.nav.hideBalance}
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </Button>
    </div>
  );
}
