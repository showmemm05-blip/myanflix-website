"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Bookmark,
  ChevronRight,
  History,
  LogOut,
  Pencil,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Kicker, StatTile } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";
import type { AppUser } from "@/types/user";

export interface ProfileViewProps {
  user: AppUser;
  onLogout: () => void;
}

/** A destination the account owner reaches often enough to deserve a tile. */
function ShortcutTile({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="group surface flex items-center gap-3 p-4 transition-[transform,background-color,box-shadow] duration-200 ease-out outline-none hover:-translate-y-0.5 hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </Link>
  );
}

export function ProfileView({ user, onLogout }: ProfileViewProps) {
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <AccountShell>
      <PageHeader eyebrow={t.profile.eyebrow} title={t.profile.title} />

      <ProfileHeader user={user} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          icon={Wallet}
          tone="finance"
          label={t.profile.walletBalance}
          value={formatKyat(user.walletBalance)}
        />
        <StatTile
          icon={ArrowDownToLine}
          tone="neutral"
          label={t.profile.totalSpent}
          value={formatKyat(user.totalSpent)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <Kicker tone="primary">{t.profile.shortcuts}</Kicker>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ShortcutTile href="/wallet" icon={Wallet} label={t.nav.wallet} />
          <ShortcutTile href="/watchlist" icon={Bookmark} label={t.nav.watchlist} />
          <ShortcutTile href="/watch-history" icon={History} label={t.watchHistory.title} />
          <ShortcutTile href="/settings" icon={Settings} label={t.nav.settings} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          {t.profile.editProfile}
        </Button>
        <Button
          variant="ghost"
          className="h-11 rounded-full px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          {t.profile.logOut}
        </Button>
      </div>

      <ProfileEditDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </AccountShell>
  );
}

export function ProfileViewSkeleton() {
  return (
    <AccountShell backdrop={false}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-[92px] rounded-2xl" />
        <Skeleton className="h-[92px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </AccountShell>
  );
}
