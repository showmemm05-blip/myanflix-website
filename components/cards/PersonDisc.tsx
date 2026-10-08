"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * THE PERSON DISC — cast and crew (DesignSystem "Person · initials").
 *
 * A 96px disc (photo, or initials in avatar-ink on the avatar disc), then the
 * name (14/18 · 700) and the role (13/18 · faint), centred, 104px wide.
 * With `href` the whole thing is one link.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("").toUpperCase();
  return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
}

export function PersonDisc({
  name,
  role,
  imageUrl,
  href,
  size = 96,
  className,
}: {
  name: string;
  role?: string | null;
  imageUrl?: string | null;
  href?: string;
  /** Disc diameter in px (96 on detail pages). */
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  const body = (
    <>
      <span
        aria-hidden
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar font-extrabold text-avatar-ink"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.29) }}
      >
        {showImage ? (
          <Image
            src={imageUrl!}
            alt=""
            fill
            sizes={`${size}px`}
            className="object-cover transition-transform duration-500 group-hover/person:scale-[1.04]"
            onError={() => setFailed(true)}
          />
        ) : (
          initialsOf(name)
        )}
      </span>
      <span className="line-clamp-2 text-center text-sm leading-[18px] font-bold text-fg transition-colors group-hover/person:text-link">
        {name}
      </span>
      {role && <span className="-mt-2 line-clamp-1 text-center text-[13px] leading-[18px] text-fg-faint">{role}</span>}
    </>
  );

  const classes = cn("group/person flex w-[104px] shrink-0 flex-col items-center gap-2.5", className);

  if (href) {
    return (
      <Link href={href} className={cn(classes, "mq-snap rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link")}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
