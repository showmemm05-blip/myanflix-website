"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { paymentService } from "@/services/api/paymentService";
import { useLanguage } from "@/lib/context/language-context";
import { useBalanceHidden } from "@/lib/hooks/use-balance-visibility";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

const MASK = "••••••";

/**
 * The live balance, read from the same ["wallet-summary"] query the /wallet
 * page uses — so it picks up the existing socket-driven
 * `wallet.balanceUpdated` cache patch (see useRealtimeWallet, mounted once in
 * the (protected) layout) with no extra realtime plumbing of its own.
 */
function useBalance() {
  const { data: summary } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
  });
  return summary;
}

/**
 * A 72px rail can't hold "1,121,000 Ks", so the tile abbreviates: millions and
 * thousands to one decimal, anything smaller in full. The exact figure is never
 * more than a hover (tooltip) or a click (the wallet page) away.
 */
function compactKyat(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  if (amount >= 10_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

/**
 * BALANCE PILL — the phone's copy, docked beside the avatar in the top bar.
 *
 * On a phone there is no rail to dock to, and the top-right corner *is* the
 * account corner, so the balance sits with the avatar rather than floating in
 * the middle of the chrome as its own status chip.
 */
export function WalletBalance({ className }: { className?: string }) {
  const { t } = useLanguage();
  const summary = useBalance();
  const [hidden, toggleHidden] = useBalanceHidden();

  return (
    <div
      className={cn(
        // The chip idiom of the design system: role tint + inset hairline, at
        // the chip scale's touch size (h-10) rather than a height of its own.
        "flex h-10 items-center gap-1.5 rounded-full bg-finance/15 pr-1 pl-3 ring-1 ring-finance/25 backdrop-blur-md ring-inset",
        className,
      )}
    >
      <Wallet className="size-3.5 shrink-0 text-finance sm:size-4" />
      <span
        key={hidden ? "hidden" : String(summary?.balance ?? "loading")}
        className="animate-in fade-in-0 slide-in-from-bottom-1 text-xs font-semibold text-finance tabular-nums duration-200 sm:text-sm"
      >
        {hidden ? MASK : summary ? formatKyat(summary.balance) : "–"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        // 36px of hit area inside the pill — the icon stays small, the target
        // does not.
        className="size-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        onClick={toggleHidden}
        aria-label={hidden ? t.nav.showBalance : t.nav.hideBalance}
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </Button>
    </div>
  );
}

/**
 * BALANCE TILE — the desktop copy, docked in the rail's footer directly above
 * the avatar.
 *
 * Moving it here takes the one permanently-visible number off the content bar
 * and files it where it belongs: with your account, in the corner, on the same
 * 72px column as the destination it describes. Tapping it opens the wallet;
 * the eye toggle lives on the phone pill and in this tile's long form (the
 * tooltip states the exact figure either way).
 */
export function WalletBalanceTile({ className }: { className?: string }) {
  const { t } = useLanguage();
  const summary = useBalance();
  const [hidden] = useBalanceHidden();

  const exact = summary ? formatKyat(summary.balance) : "–";
  const compact = summary ? compactKyat(summary.balance) : "–";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href="/wallet"
            aria-label={`${t.nav.wallet}: ${hidden ? t.nav.showBalance : exact}`}
            className={cn(
              "flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-finance/12 py-2 ring-1 ring-finance/25 transition-colors duration-200 ease-out outline-none ring-inset hover:bg-finance/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              className,
            )}
          />
        }
      >
        <Wallet className="size-4 text-finance" />
        <span className="max-w-full truncate px-1 text-[11px] font-semibold text-finance tabular-nums">
          {hidden ? "•••" : compact}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {hidden ? t.nav.showBalance : `${t.nav.wallet} · ${exact}`}
      </TooltipContent>
    </Tooltip>
  );
}
