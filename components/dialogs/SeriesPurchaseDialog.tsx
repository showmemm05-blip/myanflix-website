"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/context/library-context";
import { useAuth } from "@/lib/context/auth-context";
import { formatKyat } from "@/lib/currency";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { Series } from "@/types/series";

/** Mirrors PurchaseDialog, but for a whole show — one payment, every season and episode unlocked (including future ones). */
export function SeriesPurchaseDialog({
  series,
  open,
  onOpenChange,
}: {
  series: Series | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { purchaseSeries } = useLibrary();
  const { user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);

  if (!series) return null;

  const walletBalance = user?.walletBalance ?? 0;
  const insufficientBalance = walletBalance < series.price;

  const handleConfirm = async () => {
    setIsPurchasing(true);
    try {
      await purchaseSeries(series.id);
      onOpenChange(false);
    } catch {
      // purchaseSeries already surfaces a toast on failure
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy the whole series</DialogTitle>
          <DialogDescription>
            One purchase unlocks every season and episode — including any added in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={series.posterUrl ?? FALLBACK_POSTER_URL}
              alt={series.title}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-1">
            <p className="text-sm font-semibold">{series.title}</p>
            <p className="text-xs text-muted-foreground">
              {series.releaseYear} &middot; {series.genre}
            </p>
            <p className="text-lg font-bold text-primary">{formatKyat(series.price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-secondary/40 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4" />
            Wallet balance
          </span>
          <span className={insufficientBalance ? "font-medium text-destructive" : "font-medium"}>
            {formatKyat(walletBalance)}
          </span>
        </div>
        {insufficientBalance && (
          <p className="text-xs text-destructive">
            Insufficient balance. Deposit more funds from your wallet to complete this purchase.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPurchasing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPurchasing || insufficientBalance}>
            {isPurchasing && <Loader2 className="size-4 animate-spin" />}
            Buy Series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
