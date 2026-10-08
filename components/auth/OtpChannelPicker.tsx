"use client";

import type { ReactNode } from "react";

import { BusyDots } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/system/icons";
import { MessageIcon, TelegramIcon, ViberIcon } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

/**
 * Where a verification code can be delivered. Only SMS works today; Telegram
 * and Viber are shown as "Coming soon" and never request anything. The
 * request itself carries no channel — every code goes out by SMS.
 */
export type OtpChannel = "sms" | "telegram" | "viber";

export const OTP_CHANNELS: readonly OtpChannel[] = ["sms", "telegram", "viber"];

const channelGlyphs: Record<OtpChannel, (className?: string) => ReactNode> = {
  sms: (className) => <MessageIcon size={20} className={className} />,
  telegram: (className) => <TelegramIcon size={19} className={className} />,
  viber: (className) => <ViberIcon size={19} className={className} />,
};

/**
 * The method's mark in a 40px disc: white on a light veil inside the crimson
 * SMS row; faint on raised for the methods that are not available yet.
 */
export function OtpChannelIcon({
  channel,
  available = channel === "sms",
  className,
}: {
  channel: OtpChannel;
  available?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-slot="channel-icon"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
        available ? "bg-white/18 text-white" : "bg-raised text-fg-decor",
        className,
      )}
    >
      {channelGlyphs[channel]()}
    </span>
  );
}

/** The methods that can actually request a code today. */
const AVAILABLE: ReadonlySet<OtpChannel> = new Set<OtpChannel>(["sms"]);

interface OtpMethodButtonsProps {
  /** The visible button text for each method ("Get code by SMS"). */
  labels: Record<OtpChannel, string>;
  /** Badge on the methods that aren't available yet. */
  comingSoon: string;
  /** Screen-reader-only sentence after "Coming soon" ("Not available yet"). */
  unavailableHint: string;
  /** Shown in the SMS row while its request is in flight ("Requesting…"). */
  requestingLabel: string;
  /** The method whose request is in flight — it shows "Requesting…" and three dots. */
  sending: OtpChannel | null;
  /** Locks every button (a request is in flight). */
  disabled?: boolean;
  onSelect: (channel: OtpChannel) => void;
  /** Names the group (the step's "Get your code" heading). */
  labelledBy?: string;
  /** Read out after the name (the step's subtitle explaining the methods). */
  describedBy?: string;
}

/**
 * "Get your code" (LoginCode board): one 64px row per method. SMS is the
 * crimson row with a chevron; Telegram and Viber sit on the surface, faint,
 * with a "Coming soon" pill. Tapping an available one asks the parent to
 * request the code right away; the "Coming soon" ones stay focusable (so a
 * keyboard or screen-reader user still hears why they're there) but are
 * aria-disabled and never call onSelect.
 */
export function OtpMethodButtons({
  labels,
  comingSoon,
  unavailableHint,
  requestingLabel,
  sending,
  disabled = false,
  onSelect,
  labelledBy,
  describedBy,
}: OtpMethodButtonsProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="mt-7 flex flex-col gap-2.5">
      {OTP_CHANNELS.map((channel) => {
        const available = AVAILABLE.has(channel);
        const locked = !available || disabled;
        const busy = sending === channel;
        return (
          <button
            key={channel}
            type="button"
            aria-disabled={locked || undefined}
            aria-busy={busy || undefined}
            onClick={() => {
              if (!locked) onSelect(channel);
            }}
            className={cn(
              "flex min-h-16 w-full items-center gap-3.5 rounded-[12px] border-0 py-2.5 pl-3 text-left outline-none transition-[opacity,transform] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
              available
                ? "cursor-pointer bg-crimson pr-4 text-white hover:opacity-[.88] active:scale-[0.97]"
                : "cursor-not-allowed bg-surface pr-3.5 text-fg-faint",
              available && disabled && "cursor-default opacity-75 hover:opacity-75 active:scale-100",
            )}
          >
            <OtpChannelIcon channel={channel} available={available} />
            <span
              className={cn(
                "min-w-0 flex-1 text-base leading-[22px]",
                available ? "font-extrabold" : "font-bold",
              )}
            >
              {busy ? requestingLabel : labels[channel]}
            </span>
            {available ? (
              busy ? (
                <BusyDots />
              ) : (
                <ChevronRightIcon size={20} className="shrink-0" />
              )
            ) : (
              <span className="h-[26px] shrink-0 rounded-full bg-raised px-2.5 text-[12px] leading-[26px] font-bold whitespace-nowrap text-fg-muted">
                {comingSoon}
                <span className="sr-only">. {unavailableHint}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
