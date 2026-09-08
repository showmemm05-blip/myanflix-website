"use client";

import { MessageCircle, MessageSquareText, Send } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
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
  /** The tile the user has picked — nothing is sent until they confirm. */
  value: OtpChannel;
  labels: Record<OtpChannel, { name: string; hint: string }>;
  /** id of the visible heading that names this group. */
  labelledBy: string;
  /** id of the one-line instruction under the heading. */
  describedBy?: string;
  onChange: (channel: OtpChannel) => void;
}

/**
 * Three equal tiles — icon, app name, one-line hint — behaving as a radio
 * group: tapping one only SELECTS it; the parent's "Send code by …" button
 * is what actually asks for a code, so nobody gets a code they didn't mean
 * to request. Where the CURRENT code went is stated once, in the identity
 * row above the code field — the tiles deliberately carry no second marker.
 */
export function OtpChannelPicker({
  value,
  labels,
  labelledBy,
  describedBy,
  onChange,
}: OtpChannelPickerProps) {
  const tiles = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move the selection like native radios; Tab enters/leaves the
  // group as one stop (only the selected tile is tabbable).
  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % OTP_CHANNELS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + OTP_CHANNELS.length) % OTP_CHANNELS.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = OTP_CHANNELS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(OTP_CHANNELS[next]);
    tiles.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="grid grid-cols-3 gap-2"
    >
      {OTP_CHANNELS.map((channel, index) => {
        const isSelected = channel === value;
        return (
          <button
            key={channel}
            ref={(el) => {
              tiles.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(channel)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center ring-1 ring-inset outline-none transition-[background-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]",
              isSelected
                ? "bg-primary/10 ring-primary/60"
                : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.07] hover:ring-white/20",
            )}
          >
            <OtpChannelIcon channel={channel} />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {labels[channel].name}
              </span>
              <span className="text-xs leading-snug text-foreground/70">
                {labels[channel].hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
