"use client";

import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/components/cards/PersonDisc";
import { useShellFeedback } from "@/components/layout/shell-context";
import {
  CrownIcon,
  FeedbackIcon,
  GlobeIcon,
  ProfileIcon,
  ReceiptIcon,
  SettingsIcon,
  SignOutIcon,
} from "@/components/system/icons";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * THE ACCOUNT MENU (SHELL.md §5) — the avatar disc at the right of the top
 * bar opens it.
 *
 * Header: avatar, name, plan badge (gold "Premium until 7 Nov" or a quiet
 * "Not subscribed"). Then Profile, Settings, Transactions, Send feedback
 * (opens the shared dialog), the English | မြန်မာ switch and Sign out.
 * Wallet left the menu because it is a top-bar tab now; Watch history left
 * it on 2026-10-07 because the Profile page now shows it in its "Your
 * library" group. This menu is the way to Profile: the nav has no Profile
 * tab (owner, 2026-10-07 — the avatar already stands for it).
 *
 * A real base-ui menu: arrow keys move, Esc closes and focus returns to the
 * avatar. The language switch is a radio group inside the menu, so it is
 * reachable with the same arrow keys.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isSubscribed, expiresAt } = useSubscription();
  const openFeedback = useShellFeedback();
  const s = useSection(shellText);

  if (!user) return null;

  const initials = initialsOf(user.name);
  const until =
    isSubscribed && expiresAt
      ? new Date(expiresAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={s.accountMenu}
            className={cn(
              "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-avatar p-0 text-sm font-extrabold text-avatar-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link data-popup-open:shadow-[inset_0_0_0_2px_var(--mq-link)] max-desk:size-8 max-desk:text-xs",
              className,
            )}
          />
        }
      >
        <Avatar className="size-full after:hidden">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-transparent text-inherit">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[296px] max-w-[calc(100vw-32px)] mq-rise">
        <div className="flex items-center gap-3 px-2.5 pt-2.5 pb-3.5">
          <Avatar size="lg" className="size-11 after:hidden">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="text-base">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-[15px] leading-5 font-extrabold text-fg">{user.name}</div>
            {until ? (
              <span className="mt-1 inline-flex h-[22px] items-center gap-[5px] rounded-full bg-gold/16 px-2 text-xs font-bold text-gold">
                <CrownIcon size={11} />
                {s.premiumUntil(until)}
              </span>
            ) : (
              <span className="mt-1 inline-flex h-[22px] items-center rounded-full bg-tonal-faint px-2 text-xs font-bold text-fg-muted">
                {t.badges.notSubscribed}
              </span>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="mx-1 mt-0 mb-1.5" />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <ProfileIcon />
            {t.profile.title}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon />
            {t.nav.settings}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/transactions" />}>
            <ReceiptIcon />
            {t.transactions.title}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openFeedback}>
            <FeedbackIcon />
            {t.feedback.trigger}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Language: label on the left, the two-option switch on the right. The
            options stay in their own script on purpose. */}
        <MenuPrimitive.Group className="flex items-center justify-between gap-3 py-1.5 pr-1 pl-3">
          <MenuPrimitive.GroupLabel className="flex items-center gap-3 text-[15px] font-semibold text-fg-body">
            <GlobeIcon className="text-fg-muted" />
            {s.language}
          </MenuPrimitive.GroupLabel>
          <MenuPrimitive.RadioGroup
            value={language}
            onValueChange={(value) => {
              if (value === "en" || value === "mm") setLanguage(value);
            }}
            className="flex gap-0.5 rounded-full bg-raised p-[3px]"
          >
            {(
              [
                ["en", "English", "en"],
                ["mm", "မြန်မာ", "my"],
              ] as const
            ).map(([value, label, lang]) => (
              <MenuPrimitive.RadioItem
                key={value}
                value={value}
                lang={lang}
                closeOnClick={false}
                className="flex h-[30px] cursor-pointer items-center rounded-full px-3 text-[13px] font-bold whitespace-nowrap text-fg-muted outline-none select-none data-checked:bg-play data-checked:font-extrabold data-checked:text-ink data-highlighted:outline-2 data-highlighted:outline-offset-1 data-highlighted:outline-link data-checked:data-highlighted:text-ink"
              >
                {label}
              </MenuPrimitive.RadioItem>
            ))}
          </MenuPrimitive.RadioGroup>
        </MenuPrimitive.Group>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <SignOutIcon />
            {s.signOut}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
