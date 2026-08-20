"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Crown,
  History,
  LogOut,
  MessageSquarePlus,
  Receipt,
  Settings,
  User,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedbackDialog } from "@/components/dialogs/FeedbackDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { cn } from "@/lib/utils";

/**
 * The account menu that sits at the bottom of the desktop rail (and in the top
 * bar on tablets). It carries every account destination plus the language
 * switcher and sign-out, so the desktop layout reaches exactly what the mobile
 * overflow sheet reaches.
 */
export function AccountMenu({
  side = "right",
  align = "end",
  className,
}: {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { isSubscribed, expiresAt } = useSubscription();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              aria-label={t.nav.profile}
              className={cn(
                "rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                className,
              )}
            />
          }
        >
          <Avatar className="size-9 ring-1 ring-white/12 ring-inset">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent side={side} align={align} sideOffset={10} className="w-60">
          <DropdownMenuGroup>
            {/* Identity, then plan: the subscription badge used to sit on the
                content bar all day for something checked about once a month.
                Here it is one click away, next to the person it belongs to. */}
            <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                  isSubscribed
                    ? "bg-premium/15 text-premium ring-premium/25"
                    : "bg-white/6 text-muted-foreground ring-white/12",
                )}
              >
                <Crown className="size-3" />
                {isSubscribed && expiresAt
                  ? t.badges.premiumUntil(
                      new Date(expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                    )
                  : t.badges.notSubscribed}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User className="size-4" />
              {t.nav.profile}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/wallet" />}>
              <Wallet className="size-4" />
              {t.nav.wallet}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/transactions" />}>
              <Receipt className="size-4" />
              {t.transactions.title}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/watch-history" />}>
              <History className="size-4" />
              {t.watchHistory.title}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" />
              {t.nav.settings}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Its own group, below the destinations: everything above navigates
              somewhere, this one opens a dialog, and grouping it with the
              pages would make it read as a settings screen that doesn't exist. */}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
              <MessageSquarePlus className="size-4" />
              {t.feedback.trigger}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Option labels stay in their own script on purpose — a language
              switcher is found by recognition, not by translation. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t.language.switcherLabel}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => value && setLanguage(value as "en" | "mm")}
            >
              <DropdownMenuRadioItem value="mm">မြန်မာ</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut className="size-4" />
              {t.nav.logOut}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sibling of the menu, not a child: the menu unmounts its popup when an
          item is clicked, which would take a dialog rendered inside it along
          for the ride. */}
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
