"use client";

import {
  Check,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Send,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Where a verification code can be delivered. SMS is the default; Telegram
 * and Viber are the two chat apps most of our audience already has open.
 *
 * UI only for now — the backend sends the code the same way whichever tile
 * is chosen. The value is kept here so wiring it through to the OTP request
 * later is a one-line change at the call site, not a redesign.
 */
export type OtpChannel = "sms" | "telegram" | "viber";

export const OTP_CHANNELS: readonly OtpChannel[] = ["sms", "telegram", "viber"];

/**
 * Brand marks: a filled disc in the app's own color with a white glyph. All
 * three are "a message" glyphs on purpose — the phone handset already means
 * "your phone number" elsewhere on this form.
 */
const channelIcons: Record<OtpChannel, { bg: string; glyph: ReactNode }> = {
  sms: {
    bg: "bg-primary",
    glyph: (
      <MessageSquareText aria-hidden className="size-4" strokeWidth={2.25} />
    ),
  },
  telegram: {
    bg: "bg-[#2AABEE]",
    glyph: (
      <Send
        aria-hidden
        className="size-4 -translate-x-px translate-y-px"
        strokeWidth={2.25}
      />
    ),
  },
  viber: {
    bg: "bg-[#7360F2]",
    glyph: <MessageCircle aria-hidden className="size-4" strokeWidth={2.25} />,
  },
};

export function OtpChannelIcon({
  channel,
  className,
}: {
  channel: OtpChannel;
  className?: string;
}) {
  const { bg, glyph } = channelIcons[channel];
  return (
    <span
      aria-hidden
      data-slot="channel-icon"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-e1 ring-1 ring-white/10 ring-inset",
        bg,
        className,
      )}
    >
      {glyph}
    </span>
  );
}

interface OtpChannelPickerProps {
  /** The channel the current code went out on. */
  selected: OtpChannel;
  /** Set while a code is being requested on that channel. */
  sending: OtpChannel | null;
  /** Seconds left before another code may be requested; 0 = ready. */
  cooldown: number;
  labels: Record<OtpChannel, { name: string; hint: string }>;
  sentBadge: string;
  /** id of the visible heading that names this group. */
  labelledBy: string;
  onChoose: (channel: OtpChannel) => void;
}

/**
 * Three equal tiles — icon, app name, one-line hint. Tapping a tile asks for
 * a fresh code on that channel, so the tiles ARE the resend control; the
 * countdown underneath (rendered by the parent) says when they wake up.
 * The tile that carries the current code wears a small check on its icon so
 * it is obvious which app to go and look in.
 *
 * Locked tiles use aria-disabled rather than disabled so keyboard and
 * screen-reader users can still discover Telegram/Viber during the cooldown;
 * the parent's onChoose guard is what actually refuses the tap.
 */
export function OtpChannelPicker({
  selected,
  sending,
  cooldown,
  labels,
  sentBadge,
  labelledBy,
  onChoose,
}: OtpChannelPickerProps) {
  const locked = cooldown > 0 || sending !== null;

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="grid grid-cols-3 gap-2"
    >
      {OTP_CHANNELS.map((channel) => {
        const isSelected = channel === selected;
        const isSending = channel === sending;
        const showSent = isSelected && !isSending;
        return (
          <button
            key={channel}
            type="button"
            aria-current={isSelected ? "true" : undefined}
            aria-disabled={locked || undefined}
            onClick={() => onChoose(channel)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center outline-none ring-1 ring-inset transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isSelected
                ? "bg-white/[0.08] ring-white/25"
                : "bg-white/[0.04] ring-white/10",
              locked
                ? "cursor-not-allowed"
                : "active:scale-[0.98] not-aria-disabled:hover:bg-white/[0.07] not-aria-disabled:hover:ring-white/20",
              locked && !isSelected && "opacity-75",
            )}
          >
            {isSending ? (
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-foreground">
                <Loader2 aria-hidden className="size-4 animate-spin" />
              </span>
            ) : (
              <span className="relative">
                <OtpChannelIcon channel={channel} />
                {showSent && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                )}
              </span>
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {labels[channel].name}
              </span>
              <span className="text-xs leading-snug text-foreground/70">
                {labels[channel].hint}
              </span>
            </span>
            {showSent && <span className="sr-only">{sentBadge}</span>}
          </button>
        );
      })}
    </div>
  );
}
