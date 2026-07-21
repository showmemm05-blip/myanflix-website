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
import type { Movie } from "@/types/movie";

export function PurchaseDialog({
  movie,
  open,
  onOpenChange,
}: {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { purchaseMovie } = useLibrary();
  const { user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);

  if (!movie) return null;

  const walletBalance = user?.walletBalance ?? 0;
  const insufficientBalance = walletBalance < movie.price;

  const handleConfirm = async () => {
    setIsPurchasing(true);
    try {
      await purchaseMovie(movie.id);
      onOpenChange(false);
    } catch {
      // purchaseMovie already surfaces a toast on failure
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm purchase</DialogTitle>
          <DialogDescription>You&rsquo;ll get unlimited streaming access to this title.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={movie.posterUrl ?? FALLBACK_POSTER_URL} alt={movie.title} fill sizes="64px" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center gap-1">
            <p className="text-sm font-semibold">{movie.title}</p>
            <p className="text-xs text-muted-foreground">
              {movie.releaseYear} &middot; {movie.genre}
            </p>
            <p className="text-lg font-bold text-primary">{formatKyat(movie.price)}</p>
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
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
