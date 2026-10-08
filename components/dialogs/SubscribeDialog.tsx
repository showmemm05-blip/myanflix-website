"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, CheckIcon, CloudOffIcon, CrownIcon, InfoIcon, Tag } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  MoneyDialog,
  MoneyDialogClose,
  MoneyDialogFooter,
  MoneySummaryList,
} from "@/components/wallet/MoneyDialog";
import { ArrowDownIcon, BigCheckIcon, RetryIcon, WalletLineIcon } from "@/components/wallet/icons";
import { moneyDate } from "@/components/wallet/format";
import { onRadioKeyDown, radioTabIndex } from "@/components/wallet/radio-keys";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { subscriptionService } from "@/services/api/subscriptionService";
import { paymentService } from "@/services/api/paymentService";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** What the "Subscription activated" screen shows, kept from the moment it went through. */
interface SubscribeDone {
  planName: string;
  durationDays: number;
  price: number;
  balanceAfter: number;
}

/**
 * Subscribe (Subscribe.dc.html): a gold crown picture on top, PREMIUM,
 * "Choose a plan", the live wallet balance, gold-selectable plan cards
 * ("N Ks short" when the balance can't cover one), a red alert with a white
 * "Add money" button when the chosen plan costs more than the balance, and
 * the gold "Subscribe · price" button. Then "Subscription activated".
 */
export function SubscribeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const w = useSection(walletText);
  const shell = useSection(shellText);
  const { subscribe, isSubscribed, expiresAt } = useSubscription();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [pickedPlanId, setPickedPlanId] = useState<string | null>(null);
  const [done, setDone] = useState<SubscribeDone | null>(null);

  // Every opening starts on the plans (adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setDone(null);
      setPickedPlanId(null);
    }
  }

  const { data: plans, isLoading, isError, refetch } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    enabled: open,
  });

  // Same ["wallet-summary"] query the top bar's pill and /wallet page read —
  // keeps this dialog in sync with the realtime deposit-approval patch
  // instead of the AuthContext user snapshot, which is only refreshed on
  // login/explicit refreshProfile() calls and goes stale after a deposit.
  const {
    data: walletSummary,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
    enabled: open,
  });

  const walletBalance = walletSummary?.balance ?? 0;
  const isSubscribing = subscribingPlanId !== null;
  const plansReady = !isLoading && !isError && Boolean(plans && plans.length > 0);

  // The chosen plan: the one picked, else the first the balance covers, else the first.
  const selected =
    plans?.find((p) => p.id === pickedPlanId) ??
    plans?.find((p) => p.price <= walletBalance) ??
    plans?.[0] ??
    null;
  const selectedShort = selected !== null && walletBalance < selected.price;
  // "N Ks short" and the red alert wait for the real balance: while it loads
  // the balance reads 0, which would flash every plan as unaffordable.
  const balanceKnown = !isBalanceLoading && !isBalanceError;
  const cheapest = plans && plans.length > 0 ? Math.min(...plans.map((p) => p.price)) : 0;

  // A subscribe call debits the wallet. Letting the dialog close mid-flight — via the
  // X, Esc or the backdrop — would hide the outcome of a charge that is still going
  // through and invite a second attempt, so every dismissal path is inert until it
  // settles.
  const handleOpenChange = (next: boolean) => {
    if (!next && isSubscribing) return;
    onOpenChange(next);
  };

  const handleSubscribe = async (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    setSubscribingPlanId(planId);
    try {
      await subscribe(planId);
      // subscribe() refreshed the status and the balance; show what happened.
      if (plan) {
        setDone({
          planName: plan.name,
          durationDays: plan.durationDays,
          price: plan.price,
          balanceAfter: Math.max(0, walletBalance - plan.price),
        });
      } else {
        onOpenChange(false);
      }
    } catch {
      // subscribe() already surfaces a toast on failure
    } finally {
      setSubscribingPlanId(null);
    }
  };

  // The old "balance too low" rule (never on a balance error), now about the chosen plan.
  const tooLow = balanceKnown && plansReady && selectedShort && !isSubscribing;

  return (
    <MoneyDialog open={open} onOpenChange={handleOpenChange} grabber={false} className="overflow-hidden">
      <MoneyDialogClose
        disabled={isSubscribing}
        className="absolute top-3.5 right-3.5 z-[2] bg-art-badge backdrop-blur-[14px] hover:bg-art-badge"
      />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div aria-hidden className="relative h-[156px] overflow-hidden">
          <SubscribeArt />
          <div className="absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-b from-transparent to-popover" />
          <span className="absolute top-2 left-1/2 -ml-5 block h-[5px] w-10 rounded-[3px] bg-white/32 desk:hidden" />
        </div>

        {done ? (
          <div className="relative -mt-6 flex flex-col gap-6 px-6 pb-6 max-desk:px-4">
            <div role="status" className="flex flex-col items-center text-center">
              <span
                aria-hidden
                className="mq-rise flex size-[88px] items-center justify-center rounded-full bg-money/14 text-money"
              >
                <BigCheckIcon size={40} />
              </span>
              <DialogPrimitive.Title className="mt-5 text-[28px] leading-[34px] font-black tracking-[-0.03em] text-fg [&:lang(my)]:tracking-normal">
                {w.subscribedTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-[15px] leading-[23px] text-fg-body">
                {expiresAt ? w.premiumRunsUntil(moneyDate(expiresAt, language)) : w.premiumActive}
              </DialogPrimitive.Description>
            </div>
            <MoneySummaryList
              rows={[
                { label: w.plan, value: `${done.planName} · ${t.dialogs.planDuration(done.durationDays)}` },
                { label: w.paidFromWallet, value: `−${formatKyat(done.price)}`, valueClassName: "font-extrabold" },
                {
                  label: w.balanceNow,
                  value: formatKyat(done.balanceAfter),
                  valueClassName: "font-extrabold text-money",
                },
              ]}
            />
          </div>
        ) : (
          <div className="relative -mt-10 flex flex-col gap-5 px-6 pb-6 max-desk:px-4">
            <div>
              <Tag kind="premium">{shell.premiumTag}</Tag>
              <DialogPrimitive.Title className="mt-3 text-[30px] leading-9 font-black tracking-[-0.03em] text-fg [&:lang(my)]:tracking-normal max-desk:text-[26px] max-desk:leading-8">
                {t.dialogs.subscribeTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1.5 text-[15px] leading-[23px] text-fg-body">
                {t.dialogs.subscribeDescription}
              </DialogPrimitive.Description>
            </div>

            {isSubscribed && expiresAt && (
              <p className="flex items-start gap-2.5 rounded-[12px] bg-info/12 px-3.5 py-3 text-[14px] leading-5 font-semibold text-info">
                <InfoIcon size={18} className="mt-px shrink-0" />
                <span>{w.premiumUntilNote(moneyDate(expiresAt, language))}</span>
              </p>
            )}

            <div className="flex min-h-16 items-center gap-3.5 rounded-[14px] bg-raised px-4 py-2.5">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-money/14 text-money"
              >
                <WalletLineIcon size={20} />
              </span>
              <span id="subscribe-balance-label" className="min-w-0 flex-1 text-[15px] leading-[22px] text-fg-muted">
                {t.dialogs.walletBalance}
              </span>
              {isBalanceLoading ? (
                <span aria-hidden className="mq-skeleton h-5 w-24 rounded-[5px] bg-raised-hover" />
              ) : (
                <span
                  aria-describedby="subscribe-balance-label"
                  className="text-[20px] leading-[26px] font-extrabold whitespace-nowrap text-money nums"
                >
                  {formatKyat(walletBalance)}
                </span>
              )}
            </div>

            {isLoading ? (
              <div aria-busy="true" className="flex flex-col gap-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} aria-hidden className="mq-skeleton block h-[84px] rounded-[16px]" />
                ))}
                <p role="status" className="sr-only">
                  {w.loadingPlans}
                </p>
              </div>
            ) : isError ? (
              <div role="alert" className="flex flex-col items-center px-4 py-7 text-center">
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-danger/14 text-danger"
                >
                  <CloudOffIcon size={26} />
                </span>
                <p className="mt-3.5 text-[17px] leading-6 font-extrabold text-fg">{w.plansError}</p>
                <Button variant="tonal" size="toolbar" className="mt-3.5 h-11 px-5" onClick={() => refetch()}>
                  <RetryIcon size={18} />
                  {t.common.retry}
                </Button>
              </div>
            ) : plans && plans.length > 0 ? (
              <div role="radiogroup" aria-label={t.dialogs.subscribeTitle} className="flex flex-col gap-2.5">
                {plans.map((plan, index) => {
                  const on = selected?.id === plan.id;
                  const short = walletBalance < plan.price;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={isSubscribing || undefined}
                      tabIndex={radioTabIndex(index, selected ? plans.indexOf(selected) : -1)}
                      onClick={() => {
                        if (!isSubscribing) setPickedPlanId(plan.id);
                      }}
                      onKeyDown={(e) => {
                        if (isSubscribing) return;
                        onRadioKeyDown(e, index, plans.length, (i) => setPickedPlanId(plans[i].id));
                      }}
                      className={cn(
                        "flex min-h-[84px] w-full items-center gap-3.5 rounded-[16px] py-3.5 pr-[18px] pl-4 text-left text-fg outline-none transition-[filter,background-color,box-shadow,opacity] duration-150",
                        "hover:brightness-[1.18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                        on ? "bg-gold/10 shadow-[inset_0_0_0_2px_var(--mq-gold)]" : "bg-raised",
                        isSubscribing && !on && "opacity-45",
                        isSubscribing && "cursor-not-allowed",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          on ? "bg-gold text-gold-ink" : "shadow-[inset_0_0_0_2px_var(--mq-tonal-hover)]",
                        )}
                      >
                        {on && <CheckIcon size={14} strokeWidth={2.5} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] leading-6 font-extrabold">{plan.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="inline-flex h-[22px] items-center rounded-full bg-tonal-faint px-2 text-[12px] font-bold text-fg-body nums">
                            {t.dialogs.planDuration(plan.durationDays)}
                          </span>
                          {short && balanceKnown && (
                            <span className="text-[13px] leading-[18px] text-fg-muted nums">
                              {w.shortBy(formatKyat(plan.price - walletBalance))}
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[20px] leading-[26px] font-extrabold whitespace-nowrap nums",
                          on ? "text-gold" : "text-fg",
                        )}
                      >
                        {formatKyat(plan.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p role="status" className="px-4 py-7 text-center text-[15px] leading-[23px] text-fg-muted">
                {t.dialogs.noPlans}
              </p>
            )}

            {tooLow && selected && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-[12px] bg-danger/12 py-3.5 pr-3.5 pl-4"
              >
                <p className="flex flex-[1_1_240px] items-start gap-2.5 text-[14px] leading-5 font-semibold text-danger nums">
                  <AlertCircleIcon size={18} className="mt-px shrink-0" />
                  <span>
                    {walletBalance < cheapest
                      ? w.cheapestPlan(formatKyat(cheapest))
                      : w.needMore(formatKyat(selected.price - walletBalance), selected.name)}
                  </span>
                </p>
                <Link
                  href="/wallet?deposit=1"
                  onClick={() => onOpenChange(false)}
                  className={buttonVariants({ variant: "play", size: "toolbar" })}
                >
                  <ArrowDownIcon size={18} />
                  {w.addMoney}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {done ? (
        <MoneyDialogFooter>
          <Button variant="tonal" size="cta" className="px-5" onClick={() => onOpenChange(false)}>
            {t.withdrawalCode.done}
          </Button>
          <Link
            href="/media"
            onClick={() => onOpenChange(false)}
            className={buttonVariants({ variant: "play", size: "cta" })}
            autoFocus
          >
            {w.browsePremium}
          </Link>
        </MoneyDialogFooter>
      ) : (
        <MoneyDialogFooter>
          {/* An explicit way out, next to the plans — the corner X alone is easy to miss
              on a phone, and it is the one control that must stay put while a charge is
              in flight. */}
          <DialogPrimitive.Close
            disabled={isSubscribing}
            render={<Button variant="tonal" size="cta" className="px-5" />}
          >
            {t.common.close}
          </DialogPrimitive.Close>
          <Button
            variant="gold"
            size="cta"
            className="min-w-[240px] justify-between gap-4 px-5 max-desk:min-w-0"
            disabled={!plansReady || !selected || selectedShort}
            busy={isSubscribing}
            busyLabel={t.dialogs.subscribing}
            onClick={() => selected && handleSubscribe(selected.id)}
          >
            <span className="inline-flex items-center gap-2">
              <CrownIcon size={18} />
              {t.dialogs.subscribe}
            </span>
            {selected && <span className="nums">{formatKyat(selected.price)}</span>}
          </Button>
        </MoneyDialogFooter>
      )}
    </MoneyDialog>
  );
}

/** The gold crown under light rays, between dark curtains (decorative). */
function SubscribeArt() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 560 170"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable={false}
      className="absolute inset-0"
    >
      <rect width="560" height="170" fill="#0D0B08" />
      <path d="M280 -10 L120 170 H190 Z" className="fill-gold" opacity="0.05" />
      <path d="M280 -10 L248 170 H312 Z" className="fill-gold" opacity="0.07" />
      <path d="M280 -10 L370 170 H440 Z" className="fill-gold" opacity="0.05" />
      <circle cx="280" cy="70" r="150" className="fill-gold" opacity="0.06" />
      <circle cx="280" cy="70" r="84" className="fill-gold" opacity="0.10" />
      <path d="M0 0 H86 C70 60 96 120 58 170 H0 Z" fill="#1E0709" />
      <path d="M0 0 H44 C34 66 52 124 24 170 H0 Z" fill="#2C0A0D" />
      <path d="M560 0 H474 C490 60 464 120 502 170 H560 Z" fill="#1E0709" />
      <path d="M560 0 H516 C526 66 508 124 536 170 H560 Z" fill="#2C0A0D" />
      <g transform="translate(240 26) scale(3.33)">
        <path d="M3 18h18l1-11-5.5 4L12 4 7.5 11 2 7z" className="fill-gold" />
        <rect x="3" y="19.5" width="18" height="2" rx="1" className="fill-gold" />
      </g>
      <circle cx="190" cy="44" r="2" className="fill-gold" opacity="0.7" />
      <circle cx="372" cy="30" r="1.5" className="fill-gold" opacity="0.6" />
      <circle cx="396" cy="92" r="2" className="fill-gold" opacity="0.5" />
      <circle cx="160" cy="104" r="1.5" className="fill-gold" opacity="0.5" />
    </svg>
  );
}
