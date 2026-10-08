"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { CheckIcon, CrownIcon, PlusIcon, Tag } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { moneyDate } from "@/components/wallet/format";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatKyat } from "@/lib/currency";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { shellText } from "@/lib/i18n/sections/shell";
import { walletText } from "@/lib/i18n/sections/wallet";
import { cn } from "@/lib/utils";
import { useHomePlans } from "./home-data";
import { DEPOSIT_HREF, planCards } from "./showcase-model";

/** The anchor the hero's "See plans" and the coming-soon Subscribe cards jump to. */
export const PLANS_ANCHOR = "home-plans";

/**
 * The two ways to top up (owner, 2026-10-08: KBZPay and WavePay only). Brand names stay Latin in
 * both languages; the coloured mark is decoration.
 */
const PAY_CHIPS = [
  { name: "KBZPay", mark: "K", color: "#4DB3FF", ink: "#08080B" },
  { name: "WavePay", mark: "W", color: "#F5C451", ink: "#1F1600" },
] as const;

export function PaymentChips({ lead, className }: { lead?: string; className?: string }) {
  const h = useSection(homeText);
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {lead && <span className="mr-0.5 text-[13px] leading-[18px] text-fg-faint">{lead}</span>}
      <ul aria-label={h.paymentMethods} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {PAY_CHIPS.map((chip) => (
          <li
            key={chip.name}
            className="inline-flex h-[30px] items-center gap-[7px] rounded-full bg-raised py-0 pr-2.5 pl-1.5 text-xs font-bold text-fg-body"
          >
            <span
              aria-hidden
              className="flex size-[18px] items-center justify-center rounded-[5px] text-[10px] font-black"
              style={{ background: chip.color, color: chip.ink }}
            >
              {chip.mark}
            </span>
            {chip.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PREMIUM BAND (HomeWeb.dc.html §6): a gold-hairlined panel with the pitch
 * and what a plan includes on the left, and the REAL plans side by side on
 * the right (GET /subscription-plans — never a hard-coded price), the
 * longest marked best value. Gold Subscribe + tonal Add money and the
 * payment chips under them.
 *
 *  - Guests: no plan cards (the plans endpoint is members-only), a line
 *    saying so, and the gold "Sign in to subscribe".
 *  - Subscribers: "Your plan · expires <date>" and Extend (the same
 *    Subscribe dialog — renewals stack onto the current expiry).
 *
 * The copy is only what is true today: any plan unlocks every Premium movie
 * and series; books have no access type and are free once signed in.
 */
export function HomePremiumBand() {
  const { language, t } = useLanguage();
  const h = useSection(homeText);
  const s = useSection(shellText);
  const w = useSection(walletText);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isSubscribed, expiresAt, planName } = useSubscription();
  const plans = useHomePlans(isAuthenticated);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const cards = planCards(plans.data);
  const perks = [h.perkUnlocks, h.perkStreams, h.perkWallet, h.perkNoAutoCharge];
  const lines = [h.planLineEvery, h.planLineStreams, h.planLineStack];

  return (
    <section id={PLANS_ANCHOR} aria-labelledby="home-plans-title" className="scroll-mt-[calc(var(--shell-bar-h)+16px)] px-gutter">
      <div className="relative overflow-hidden rounded-[20px] bg-surface p-[clamp(24px,3vw,40px)] shadow-[inset_0_0_0_1px_rgba(245,196,81,0.22)]">
        <svg
          aria-hidden
          focusable={false}
          width="420"
          height="420"
          viewBox="0 0 420 420"
          className="pointer-events-none absolute -top-[120px] -right-20 opacity-90"
        >
          <circle cx="210" cy="210" r="200" fill="#F5C451" opacity="0.05" />
          <circle cx="210" cy="210" r="120" fill="#F5C451" opacity="0.06" />
          <path d="M150 262h120l8-74-38 28L210 160l-30 56-38-28z" fill="#F5C451" opacity="0.14" />
        </svg>

        <div className="relative grid items-start gap-x-[clamp(24px,3vw,48px)] gap-y-7 desk:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Tag kind="premium" className="h-6 rounded-[6px] px-[9px] text-xs leading-4">
              {s.premiumTag}
            </Tag>
            <h2
              id="home-plans-title"
              className="mt-3.5 text-[clamp(26px,2.4vw,34px)] leading-[1.15] font-black tracking-[-0.03em] text-fg text-balance"
            >
              {h.plansTitle}
            </h2>
            <p className="mt-2.5 max-w-[44ch] text-base leading-[25px] text-fg-muted">{h.plansBody}</p>
            <ul className="mt-[18px] flex list-none flex-col gap-2.5 p-0">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-[15px] leading-[22px] text-fg-body">
                  <CheckIcon size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-gold" />
                  {perk}
                </li>
              ))}
            </ul>
            {isSubscribed && expiresAt && (
              <p className="mt-[18px] inline-flex min-h-8 items-center gap-2 rounded-full bg-money/14 px-3 py-1 text-[13px] font-extrabold text-money">
                <CheckIcon size={14} strokeWidth={2.4} />
                {h.yourPlanExpires(moneyDate(expiresAt, language))}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-4">
            {isAuthenticated && plans.isLoading && (
              <>
                <span aria-hidden className="mq-skeleton block h-[236px] rounded-[16px]" />
                <span aria-hidden className="mq-skeleton block h-[236px] rounded-[16px]" />
              </>
            )}
            {cards.map(({ plan, perDay, perDayExact, best }) => {
              const current = isSubscribed && planName !== null && plan.name === planName;
              return (
                <div
                  key={plan.id}
                  role="group"
                  aria-label={h.planCard(plan.name, formatKyat(plan.price), plan.durationDays, best)}
                  className={cn(
                    "relative min-w-0 rounded-[16px] bg-raised p-5",
                    best ? "shadow-[inset_0_0_0_1.5px_var(--mq-gold)]" : "shadow-[inset_0_0_0_1px_var(--mq-hairline)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "min-w-0 truncate text-sm leading-5 font-extrabold tracking-[0.04em] uppercase [&:lang(my)]:tracking-normal",
                        best ? "text-gold" : "text-fg-muted",
                      )}
                    >
                      {plan.name}
                    </span>
                    {current ? (
                      <Tag kind="approved" className="rounded-full px-2">
                        {h.yourPlanTag}
                      </Tag>
                    ) : (
                      best && (
                        <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-gold px-2 text-[11px] font-extrabold tracking-[0.04em] text-gold-ink uppercase [&:lang(my)]:tracking-normal">
                          {h.bestValue}
                        </span>
                      )
                    )}
                  </div>
                  <p className="mt-3.5 text-[clamp(30px,2.6vw,38px)] leading-none font-black tracking-[-0.03em] text-fg tabular-nums">
                    {formatKyat(plan.price)}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-[22px] font-bold text-fg-body">{h.planDays(plan.durationDays)}</p>
                  <p className="mt-0.5 text-[13px] leading-[18px] text-fg-faint tabular-nums">
                    {h.perDay(formatKyat(perDay), perDayExact)}
                  </p>
                  <ul className="mt-4 flex list-none flex-col gap-2 p-0">
                    {lines.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm leading-5 text-fg-body">
                        <CheckIcon
                          size={16}
                          strokeWidth={2.2}
                          className={cn("mt-0.5 shrink-0", best ? "text-gold" : "text-fg-muted")}
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {!isAuthenticated && <p className="col-span-full m-0 text-[15px] leading-[22px] text-fg-muted">{h.plansSignInNote}</p>}
            {isAuthenticated && plans.isError && cards.length === 0 && (
              <p role="status" className="col-span-full m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-[22px] text-fg-muted">
                {h.plansLoadFailed}
                <button
                  type="button"
                  onClick={() => void plans.refetch()}
                  className="min-h-8 font-bold text-fg underline underline-offset-4 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t.common.retry}
                </button>
              </p>
            )}

            <div className="col-span-full mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="gold"
                    size="cta"
                    className="px-[22px]"
                    aria-haspopup="dialog"
                    onClick={() => setSubscribeOpen(true)}
                  >
                    <CrownIcon size={16} />
                    {isSubscribed ? h.extend : h.subscribe}
                  </Button>
                  <Link href={DEPOSIT_HREF} className={buttonVariants({ variant: "tonal", size: "cta", className: "px-5" })}>
                    <PlusIcon size={18} strokeWidth={2} className="text-money" />
                    {w.addMoney}
                  </Link>
                </>
              ) : (
                <Link
                  href={loginHref(pathname)}
                  className={buttonVariants({ variant: "gold", size: "cta", className: "px-[22px]" })}
                >
                  <CrownIcon size={16} />
                  {h.signInToSubscribe}
                </Link>
              )}
              <PaymentChips lead={h.payWith} className="desk:ml-auto" />
            </div>
            <p className="col-span-full m-0 text-[13px] leading-[18px] text-fg-faint">{h.booksFree}</p>
          </div>
        </div>
      </div>
      {isAuthenticated && <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />}
    </section>
  );
}
