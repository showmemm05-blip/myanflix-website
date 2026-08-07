"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/lib/context/subscription-context";
import { subscriptionService } from "@/services/api/subscriptionService";
import { paymentService } from "@/services/api/paymentService";
import { formatKyat } from "@/lib/currency";

export function SubscribeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { subscribe } = useSubscription();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    enabled: open,
  });

  // Same ["wallet-summary"] query the navbar pill and /wallet page read —
  // keeps this dialog in sync with the realtime deposit-approval patch
  // instead of the AuthContext user snapshot, which is only refreshed on
  // login/explicit refreshProfile() calls and goes stale after a deposit.
  const { data: walletSummary } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
    enabled: open,
  });

  const walletBalance = walletSummary?.balance ?? 0;

  const handleSubscribe = async (planId: string) => {
    setSubscribingPlanId(planId);
    try {
      await subscribe(planId);
      onOpenChange(false);
    } catch {
      // subscribe() already surfaces a toast on failure
    } finally {
      setSubscribingPlanId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            Subscribe for unlimited streaming access to every subscription title, for 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-secondary/40 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4" />
            Wallet balance
          </span>
          <span className="font-medium">{formatKyat(walletBalance)}</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </>
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => {
              const insufficientBalance = walletBalance < plan.price;
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">30 days</p>
                    <p className="text-base font-bold text-primary">{formatKyat(plan.price)}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={subscribingPlanId !== null || insufficientBalance}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {subscribingPlanId === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Subscribe
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No subscription plans are available right now.
            </p>
          )}
        </div>
        {plans && plans.length > 0 && walletBalance < Math.min(...plans.map((p) => p.price)) && (
          <p className="text-xs text-destructive">
            Insufficient balance. Deposit more funds from your wallet to subscribe.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={subscribingPlanId !== null}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
