"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/empty/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip, Surface } from "@/components/system";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { subscriptionService } from "@/services/api/subscriptionService";
import { paymentService } from "@/services/api/paymentService";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function SubscribeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const { subscribe } = useSubscription();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  const { data: plans, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    enabled: open,
  });

  // Same ["wallet-summary"] query the navbar pill and /wallet page read —
  // keeps this dialog in sync with the realtime deposit-approval patch
  // instead of the AuthContext user snapshot, which is only refreshed on
  // login/explicit refreshProfile() calls and goes stale after a deposit.
  const { data: walletSummary, isError: isBalanceError } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
    enabled: open,
  });

  const walletBalance = walletSummary?.balance ?? 0;
  const isSubscribing = subscribingPlanId !== null;

  // A subscribe call debits the wallet. Letting the dialog close mid-flight — via the
  // X, Esc or the backdrop — would hide the outcome of a charge that is still going
  // through and invite a second attempt, so every dismissal path is inert until it
  // settles (the request itself closes the dialog on success).
  const handleOpenChange = (next: boolean) => {
    if (!next && isSubscribing) return;
    onOpenChange(next);
  };

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

  const balanceTooLow =
    !isBalanceError &&
    Boolean(plans && plans.length > 0) &&
    walletBalance < Math.min(...(plans ?? []).map((p) => p.price));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Same shell as the other dialogs in the app: capped to the viewport with the
          content itself scrolling, so a long list of plans can never push the
          subscribe buttons off a short phone screen. */}
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-5 ring-white/10 sm:max-w-md sm:p-6",
          // The corner X belongs to the shell, so it is dimmed and made inert here
          // rather than removed — the dialog keeps the same anatomy while it works.
          // Scoped to the direct child so the footer's own Close (already `disabled`)
          // isn't dimmed twice.
          isSubscribing && "[&>[data-slot=dialog-close]]:pointer-events-none [&>[data-slot=dialog-close]]:opacity-50",
        )}
      >
        {/* Gold is the subscription role colour throughout the app — a single
            crown disc says what this dialog is before any text is read. */}
        <DialogHeader>
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-premium/15 text-premium ring-1 ring-premium/25 ring-inset">
            <Crown className="size-5" />
          </span>
          <DialogTitle className="text-section-title">{t.dialogs.subscribeTitle}</DialogTitle>
          <DialogDescription>{t.dialogs.subscribeDescription}</DialogDescription>
        </DialogHeader>

        <Surface tone="subtle" className="flex items-center justify-between gap-3 p-3">
          <span className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-finance/15 text-finance ring-1 ring-finance/25 ring-inset">
              <Wallet className="size-4.5" />
            </span>
            {t.dialogs.walletBalance}
          </span>
          <span className="font-heading text-base font-bold text-finance nums">
            {formatKyat(walletBalance)}
          </span>
        </Surface>

        <div className="flex flex-col gap-2.5">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => {
              const insufficientBalance = walletBalance < plan.price;
              return (
                <Surface
                  key={plan.id}
                  tone="outline"
                  className={cn(
                    "flex items-center justify-between gap-3 p-4 transition-[box-shadow,background-color] duration-200 ease-out",
                    !insufficientBalance && "hover:bg-premium/6 hover:ring-premium/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold tracking-tight">{plan.name}</p>
                    <Chip tone="neutral" size="sm" className="mt-1 nums">
                      {t.dialogs.days30}
                    </Chip>
                    <p className="mt-1.5 font-heading text-lg font-bold text-premium nums">
                      {formatKyat(plan.price)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-10 shrink-0 rounded-full px-4"
                    disabled={isSubscribing || insufficientBalance}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {subscribingPlanId === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {subscribingPlanId === plan.id ? t.dialogs.subscribing : t.dialogs.subscribe}
                  </Button>
                </Surface>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.dialogs.noPlans}</p>
          )}
        </div>

        {balanceTooLow && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-destructive">{t.dialogs.insufficientBalance}</p>
            <Button
              variant="outline"
              size="sm"
              className="h-10 shrink-0 rounded-full px-4"
              render={<Link href="/wallet" />}
              nativeButton={false}
            >
              {t.dialogs.topUp}
            </Button>
          </div>
        )}

        {/* An explicit way out, next to the plans — the corner X alone is easy to miss
            on a phone, and it is the one control that must stay put while a charge is
            in flight. */}
        <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent p-0 pt-1">
          <DialogClose
            render={<Button variant="ghost" className="h-11 rounded-full px-5" />}
            disabled={isSubscribing}
          >
            {t.common.close}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
