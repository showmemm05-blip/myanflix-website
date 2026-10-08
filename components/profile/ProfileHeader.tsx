"use client";

import type { ReactNode } from "react";
import { Camera } from "lucide-react";

import { AvatarDisc, useAvatarActions } from "@/components/profile/ProfileSections";
import { CrownIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText, monthYear, shortDate } from "@/lib/i18n/sections/library";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

/**
 * The Profile page's identity block (Profile board): a 112px photo or
 * initials disc with the crimson camera button (it opens the file picker and
 * uploads straight away — same guards and toasts as before), Remove photo
 * under it once there is one, the name as the page H1, "@username · phone",
 * "Member since …", and the gold Premium / grey Not subscribed badge.
 * `actions` (Edit profile, Log out) sit on the right.
 */
export function ProfileHeader({ user, actions }: { user: AppUser; actions?: ReactNode }) {
  const { t, language } = useLanguage();
  const lib = useSection(libraryText);
  const photo = useAvatarActions();
  const busy = photo.busy !== null;

  const memberSince = monthYear(user.joinDate, language);
  const expiresAt = user.subscriptionExpiresAt ? shortDate(user.subscriptionExpiresAt, language) : null;
  // Same rule as the Subscription panel below: a subscriber is Premium even
  // when no end date is on record (then the badge just says "Premium").
  const premium = user.isSubscribed;

  return (
    <section aria-labelledby="profile-name" className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-5">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="relative">
          <AvatarDisc user={user} src={photo.preview} size={112} busy={busy} />
          <button
            type="button"
            onClick={photo.pick}
            disabled={busy}
            aria-label={user.avatarUrl ? t.profile.changePhoto : t.profile.uploadPhoto}
            title={user.avatarUrl ? t.profile.changePhoto : t.profile.uploadPhoto}
            className="mq-press absolute -right-0.5 -bottom-0.5 flex size-[38px] cursor-pointer items-center justify-center rounded-full border-0 bg-crimson text-white shadow-[0_0_0_3px_var(--mq-ground)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-default disabled:opacity-60"
          >
            <Camera className="size-[18px]" strokeWidth={1.75} />
          </button>
          {photo.fileInput}
        </div>
        {user.avatarUrl && (
          <button
            type="button"
            onClick={photo.remove}
            disabled={busy}
            className="h-8 cursor-pointer rounded-[8px] border-0 bg-transparent px-2 text-[13px] font-bold text-fg-faint outline-none transition-colors duration-150 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-40"
          >
            {t.profile.removePhoto}
          </button>
        )}
      </div>

      <div className="min-w-[240px] flex-1 max-desk:min-w-0">
        <h1 id="profile-name" className="text-title [overflow-wrap:anywhere] text-fg">
          {user.name}
        </h1>
        <p className="mt-1.5 text-[15px] leading-[22px] text-fg-body tabular-nums">
          @{user.username}
          {user.phone && (
            <>
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {user.phone}
            </>
          )}
        </p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-fg-faint">{t.profile.memberSince(memberSince)}</p>
        <span
          className={cn(
            "mt-3 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-extrabold tabular-nums",
            premium ? "bg-gold/16 text-gold" : "bg-tonal-faint text-fg-muted",
          )}
        >
          {premium && <CrownIcon size={13} />}
          {premium ? (expiresAt ? lib.premiumExpires(expiresAt) : t.badges.premium) : t.profile.notSubscribed}
        </span>
      </div>

      {actions && <div className="ml-auto flex flex-wrap items-center gap-2 max-desk:ml-0">{actions}</div>}
    </section>
  );
}
