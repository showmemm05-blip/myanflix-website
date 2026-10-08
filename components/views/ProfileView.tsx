"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, LogOut, Pencil } from "lucide-react";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import {
  BookmarkIcon,
  ChevronRightIcon,
  CrownIcon,
  HistoryIcon,
  ReceiptIcon,
  SettingsIcon,
  WalletIcon,
} from "@/components/system/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { AccountKicker, AccountLayout } from "@/components/views/AccountShell";
import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText, shortDate } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { paymentService } from "@/services/api/paymentService";
import type { AppUser } from "@/types/user";

export interface ProfileViewProps {
  user: AppUser;
  onLogout: () => void;
  /**
   * The "Your library" group (My List + Watch history shelves), shown right
   * under the profile header. The page builds it from its own queries.
   */
  library?: ReactNode;
}

const panelClass = "flex flex-col rounded-[16px] bg-surface p-7 max-desk:p-5";
const panelHeadingClass = "text-kicker";

/** A destination the account owner reaches often enough to deserve a tile. */
function PageTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group/tile flex h-[72px] items-center gap-3.5 rounded-[12px] bg-surface px-4 outline-none transition-colors duration-150 hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crimson/14 text-link">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] leading-5 font-bold text-fg">{label}</span>
      <ChevronRightIcon
        size={18}
        className="shrink-0 text-fg-faint transition-transform duration-200 group-hover/tile:translate-x-0.5"
      />
    </Link>
  );
}

/**
 * The Profile page (Profile board): the account side menu, the identity
 * block (photo, name, sign-in identity, member since, plan badge, Edit
 * profile + Log out), then the "Your library" group (My List and Watch
 * history shelves — the Profile page took the Library tab's place on
 * 2026-10-07), then two panels — Subscription (status, View plans or the
 * gold Subscribe) and Wallet (balance in green, total spent, Deposit,
 * Withdraw, Transactions) — and the four "Your pages" tiles.
 */
export function ProfileView({ user, onLogout, library }: ProfileViewProps) {
  const { t, language } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const [editOpen, setEditOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  // The same ["wallet-summary"] entry the top-bar balance pill and the wallet
  // page read, so the figure here moves the moment a deposit is approved.
  // Until it loads, the balance the session already knows.
  const { data: wallet } = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: () => paymentService.getWalletSummary(),
    staleTime: 30_000,
  });
  const balance = wallet?.balance ?? user.walletBalance;
  const totalSpent = wallet?.totalSpent ?? user.totalSpent;

  const expiresAt = user.subscriptionExpiresAt ? shortDate(user.subscriptionExpiresAt, language, "long") : null;
  const subscribed = user.isSubscribed;

  return (
    <AccountLayout current="profile">
      <AccountKicker>{t.profile.eyebrow}</AccountKicker>

      <ProfileHeader
        user={user}
        actions={
          <>
            <Button variant="tonal" size="cta" className="pl-4" aria-haspopup="dialog" onClick={() => setEditOpen(true)}>
              <Pencil className="size-[18px]" strokeWidth={1.75} />
              {t.profile.editProfile}
            </Button>
            <Button
              variant="ghost"
              size="cta"
              className="px-3.5 text-[15px] text-fg-muted hover:bg-transparent hover:text-danger"
              onClick={onLogout}
            >
              <LogOut className="size-[18px]" strokeWidth={1.75} />
              {t.profile.logOut}
            </Button>
          </>
        }
      />

      {library}

      <div className="mt-9 grid gap-4 desk:grid-cols-2">
        <section aria-labelledby="profile-subscription" className={panelClass}>
          <h2 id="profile-subscription" className={panelHeadingClass}>
            {lib.subscriptionHeading}
          </h2>
          <div className="mt-[18px] flex items-center gap-3.5">
            <span
              aria-hidden
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full",
                subscribed ? "bg-gold/16 text-gold" : "bg-tonal-faint text-fg-faint",
              )}
            >
              <CrownIcon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-section-title text-fg">{subscribed ? t.badges.premium : t.profile.notSubscribed}</p>
              <p className="mt-0.5 text-sm leading-5 text-fg-muted tabular-nums">
                {subscribed
                  ? expiresAt
                    ? t.profile.subscriptionActive(expiresAt)
                    : lib.planActive
                  : lib.freeMember}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-[23px] text-fg-body">
            {subscribed ? lib.subBodyPremium : lib.subBodyFree}
          </p>
          <div className="mt-auto pt-[22px]">
            {subscribed ? (
              <Button variant="tonal" size="cta" aria-haspopup="dialog" onClick={() => setSubscribeOpen(true)}>
                {lib.viewPlans}
              </Button>
            ) : (
              <Button variant="gold" size="cta" aria-haspopup="dialog" onClick={() => setSubscribeOpen(true)}>
                <CrownIcon size={16} />
                {t.watchlist.subscribeCta}
              </Button>
            )}
          </div>
        </section>

        <section aria-labelledby="profile-wallet" className={panelClass}>
          <h2 id="profile-wallet" className={panelHeadingClass}>
            {t.nav.wallet}
          </h2>
          <p className="mt-[18px] text-sm leading-5 text-fg-muted">{t.profile.walletBalance}</p>
          <p className="mt-0.5 text-[clamp(32px,3vw,40px)] leading-[1.1] font-black tracking-[-0.02em] text-money tabular-nums">
            {formatKyat(balance)}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm leading-5 text-fg-muted tabular-nums">
            <ReceiptIcon size={16} />
            {t.profile.totalSpent}
            <span className="font-bold text-fg">{formatKyat(totalSpent)}</span>
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-[22px]">
            <Link href="/wallet" className={cn(buttonVariants({ variant: "commit", size: "cta" }), "pl-4")}>
              <ArrowDownToLine className="size-[18px]" strokeWidth={1.75} />
              {t.wallet.deposit}
            </Link>
            <Link href="/wallet" className={cn(buttonVariants({ variant: "tonal", size: "cta" }), "pl-4")}>
              <ArrowUpFromLine className="size-[18px]" strokeWidth={1.75} />
              {t.wallet.withdraw}
            </Link>
            <Link
              href="/transactions"
              className="mq-link ml-1 rounded-[6px] text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {t.transactions.title}
            </Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="profile-pages" className="mt-10">
        <h2 id="profile-pages" className={panelHeadingClass}>
          {t.profile.shortcuts}
        </h2>
        <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 max-desk:grid-cols-2">
          <PageTile href="/wallet" icon={WalletIcon} label={t.nav.wallet} />
          <PageTile href="/watchlist" icon={BookmarkIcon} label={shell.myList} />
          <PageTile href="/watch-history" icon={HistoryIcon} label={lib.watchHistory} />
          <PageTile href="/settings" icon={SettingsIcon} label={t.nav.settings} />
        </div>
      </section>

      <ProfileEditDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </AccountLayout>
  );
}

export function ProfileViewSkeleton() {
  const lib = useSection(libraryText);
  const { t } = useLanguage();
  return (
    <AccountLayout current="profile">
      <AccountKicker>{t.profile.eyebrow}</AccountKicker>
      <div aria-busy="true" className="mt-4">
        <p role="status" className="sr-only">
          {lib.loadingProfile}
        </p>
        <div className="flex items-center gap-6">
          <span className="mq-skeleton block size-28 shrink-0 rounded-full" />
          <span className="flex-1">
            <span className="mq-skeleton block h-9 w-60 max-w-full rounded-[8px]" />
            <span className="mq-skeleton mt-3 block h-3.5 w-[200px] max-w-full rounded-[5px]" />
            <span className="mq-skeleton mt-3 block h-[26px] w-40 rounded-full" />
          </span>
        </div>
        <div className="mt-9 grid gap-4 desk:grid-cols-2">
          <span className="mq-skeleton block h-[232px] rounded-[16px]" />
          <span className="mq-skeleton block h-[232px] rounded-[16px]" />
        </div>
      </div>
    </AccountLayout>
  );
}
