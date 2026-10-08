"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The storefront's scroll-in entrance, in the Marquee "rise" (12px up, 0.5s,
 * the shared decelerating curve). Each section fades up once as it enters the
 * viewport.
 *
 * Reduced motion: no animation at all — the content renders in place (the
 * global CSS guard cannot reach framer-motion's inline styles, so this
 * component checks the setting itself).
 *
 * LazyMotion + `m` loads only the DOM animation features this needs instead
 * of the whole motion library (`motion.div` pulls in every feature).
 */
export function RevealSection({
  children,
  className,
  delay = 0,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(className)}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
