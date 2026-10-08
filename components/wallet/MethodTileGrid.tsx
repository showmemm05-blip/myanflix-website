"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon } from "@/components/system";
import { BankIcon } from "@/components/wallet/icons";
import { onRadioKeyDown, radioTabIndex } from "@/components/wallet/radio-keys";
import { cn } from "@/lib/utils";

export interface MethodTileOption {
  type: string;
  label: string;
  logoUrl: string | null;
  /** Bank transfers (the catalog's requiresBankName) get a bank glyph when there is no logo. */
  isBank?: boolean;
}

/**
 * The initials discs' colours, from the boards (KBZPay navy, Wave amber,
 * AYA wine, CB teal, bank indigo). Artwork colours, not UI tokens — a
 * method keeps the same disc everywhere because the pick hashes its name.
 */
const DISCS: readonly { bg: string; fg: string }[] = [
  { bg: "#12305A", fg: "#8CCBF2" },
  { bg: "#33240F", fg: "#F2B66D" },
  { bg: "#2E1420", fg: "var(--mq-avatar-ink)" },
  { bg: "#10282A", fg: "#7FD6C2" },
  { bg: "#1E2340", fg: "#8CA5F2" },
];

function discFor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return DISCS[hash % DISCS.length];
}

/** "KBZPay" → KBZ · "Wave Money" → WM · "AYA Pay" → AYA · "CB Pay" → CB. */
export function methodInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0];
  if (first.length <= 4 && first === first.toUpperCase() && /[A-Z]/.test(first)) return first;
  if (words.length > 1) return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
  const capitals = first.match(/[A-Z]/g);
  if (capitals && capitals.length >= 2) return capitals.slice(0, 3).join("");
  return first.slice(0, 2).toUpperCase();
}

/**
 * A payment method's mark: the admin-uploaded logo when there is one (owner
 * decision), otherwise an initials disc — or a bank glyph for bank
 * transfers. A logo that fails to load falls back to the disc too.
 */
export function MethodLogo({
  logoUrl,
  label = "",
  isBank = false,
  size = 40,
  className,
}: {
  logoUrl: string | null | undefined;
  label?: string;
  isBank?: boolean;
  size?: number;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showLogo = Boolean(logoUrl) && failedUrl !== logoUrl;
  const disc = isBank ? DISCS[4] : discFor(label);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-[12px] leading-none font-black tracking-[-0.02em]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: showLogo ? "var(--mq-play)" : disc.bg,
        color: disc.fg,
        fontSize: size >= 48 ? 13 : size <= 28 ? 10 : 12,
      }}
    >
      {showLogo ? (
        <Image
          src={logoUrl as string}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized
          onError={() => setFailedUrl(logoUrl ?? null)}
        />
      ) : isBank ? (
        <BankIcon size={Math.round(size * 0.5)} />
      ) : (
        methodInitials(label)
      )}
    </span>
  );
}

/**
 * The method picker (Deposit "Payment method", Withdraw "Account type"):
 * logo above the name, one 92px tile per method. The selected tile gets a
 * crimson ring, a crimson wash and a check disc in the corner — stated
 * twice on purpose, because picking the wrong account sends money to the
 * wrong place. A radio group, so screen readers hear "selected": one Tab
 * stop, arrow keys move between methods (and pick them).
 */
export function MethodTileGrid({
  methods,
  selected,
  onSelect,
  labelledBy,
  columns = 4,
}: {
  methods: MethodTileOption[];
  selected: string | null;
  onSelect: (type: string) => void;
  /** id of the visible label above the tiles. */
  labelledBy?: string;
  /** 4 for deposit methods, 5 for the withdraw account types. */
  columns?: 4 | 5;
}) {
  const selectedIndex = methods.findIndex((m) => m.type === selected);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "mt-2.5 grid gap-2",
        columns === 5
          ? "grid-cols-5 max-desk:grid-cols-3"
          : "grid-cols-4 max-desk:grid-cols-2",
      )}
    >
      {methods.map((m, index) => {
        const isActive = selected === m.type;
        return (
          <button
            key={m.type}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={radioTabIndex(index, selectedIndex)}
            onClick={() => onSelect(m.type)}
            onKeyDown={(e) => onRadioKeyDown(e, index, methods.length, (i) => onSelect(methods[i].type))}
            className={cn(
              "relative flex min-h-[92px] w-full flex-col items-center gap-2 rounded-[12px] px-1.5 pt-3.5 pb-3 text-fg outline-none transition-[filter,background-color,box-shadow] duration-150",
              "hover:brightness-[1.18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
              isActive ? "bg-crimson/14 shadow-[inset_0_0_0_2px_var(--mq-crimson)]" : "bg-raised",
            )}
          >
            <MethodLogo logoUrl={m.logoUrl} label={m.label} isBank={m.isBank && !m.logoUrl} />
            <span className="line-clamp-2 text-center text-[13px] leading-[18px] font-bold">{m.label}</span>
            {isActive && (
              <span
                aria-hidden
                className="absolute top-[7px] right-[7px] flex size-[18px] items-center justify-center rounded-full bg-crimson text-white"
              >
                <CheckIcon size={12} strokeWidth={2.5} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
