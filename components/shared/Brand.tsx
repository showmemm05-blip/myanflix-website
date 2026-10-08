"use client";

import Link from "next/link";

import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";

/**
 * The one logo lockup: a crimson bar and the MyanFlix wordmark (900, −0.03em).
 *
 *   size="md"  top bar — 6×26 bar, 24/30 type (20/26 under 720px)
 *   size="sm"  footer  — 5×20 bar, 18/24 type
 *   size="lg"  sign-in artwork panel — 7×32 bar, 30/36 type
 *
 * `href={null}` renders it as plain text (no link). The link is named
 * "MyanFlix home".
 */
export function Brand({
  size = "md",
  href = "/",
  wordmarkClassName,
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  wordmarkClassName?: string;
  className?: string;
}) {
  const s = useSection(shellText);
  const mark = (
    <>
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-[2px] bg-crimson",
          size === "sm" && "h-5 w-[5px]",
          size === "md" && "h-[26px] w-1.5 max-desk:h-[22px] max-desk:w-[5px]",
          size === "lg" && "h-8 w-[7px]",
        )}
      />
      <span
        className={cn(
          "font-black tracking-[-0.03em] whitespace-nowrap text-fg",
          size === "sm" && "text-lg leading-6",
          size === "md" && "text-2xl leading-[30px] max-desk:text-xl max-desk:leading-[26px]",
          size === "lg" && "text-[30px] leading-9",
          wordmarkClassName,
        )}
      >
        MyanFlix
      </span>
    </>
  );
  const classes = cn("flex shrink-0 items-center", size === "sm" ? "gap-2" : "gap-2.5", className);

  if (href === null) return <span className={classes}>{mark}</span>;
  return (
    <Link
      href={href}
      aria-label={s.homeLink}
      className={cn(classes, "rounded-[8px] outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link")}
    >
      {mark}
    </Link>
  );
}
