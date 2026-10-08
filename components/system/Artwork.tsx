"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { FallbackArt, artPalette, type FallbackArtVariant } from "./FallbackArt";

/**
 * A title's picture, or its fallback scene. Fills its positioned parent.
 *
 * - `src` set and loading fine → the real image (object-cover).
 * - `src` missing, or the image fails → <FallbackArt> drawn from `seed`,
 *   and `onFallback` tells the card so it can set the title into the art.
 *
 * The parent should carry `overflow-hidden` and the radius. `zoomOnHover`
 * adds the card hover scale (1.04 over 500ms) when inside a `group/card`.
 */
export function Artwork({
  src,
  seed,
  variant = "poster",
  alt = "",
  sizes,
  priority = false,
  zoomOnHover = true,
  className,
  children,
}: {
  src: string | null | undefined;
  /** Seed for the fallback scene — usually the title. */
  seed: string;
  variant?: FallbackArtVariant;
  /** Decorative by default: the card's link carries the name. */
  alt?: string;
  sizes?: string;
  priority?: boolean;
  zoomOnHover?: boolean;
  className?: string;
  /** Rendered only when the fallback is showing (e.g. the title set in the art). */
  children?: React.ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const zoom = zoomOnHover
    ? "transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:scale-[1.04]"
    : undefined;

  return (
    <>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailedSrc(src ?? null)}
          className={cn("object-cover", zoom, className)}
          style={{ backgroundColor: artPalette(seed).bg }}
        />
      ) : (
        <>
          <FallbackArt seed={seed} variant={variant} className={cn(zoom, className)} />
          {children}
        </>
      )}
    </>
  );
}
