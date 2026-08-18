"use client";

import type { ReactNode } from "react";

import { Brand } from "@/components/shared/Brand";
import { AuroraBackdrop, Chip, Kicker, Surface } from "@/components/system";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * AURORA THEATER — the sign-in stage.
 *
 * Both /login and /register are the same screen with different copy (the flow
 * inside is literally the same component), so the frame lives here once: an
 * artwork panel on the left that carries all the color, and a single focused
 * card on the right that carries all the attention. Below lg the panel drops
 * away entirely and the card becomes the whole page — a form on a phone should
 * be a form, not a collage.
 */
export function AuthLayout({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: {
  /** The editorial eyebrow above the title. */
  kicker: string;
  title: string;
  subtitle: string;
  /** The step machine itself. */
  children: ReactNode;
  /** The cross-link to the other auth route. */
  footer: ReactNode;
}) {
  return (
    <div className="relative isolate grid min-h-[calc(100vh-8rem)] lg:grid-cols-[1.05fr_minmax(26rem,0.95fr)]">
      <ArtworkPanel />

      <div className="relative flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
        {/* The phone layout has no artwork panel, so the ambient light comes
            here instead — behind the card, never behind its text. */}
        <AuroraBackdrop variant="page" className="lg:hidden" />

        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 flex justify-center lg:hidden">
            <Brand size="lg" />
          </div>

          <Surface tone="raised" radius="2xl" padding="lg" className="shadow-e3">
            <div className="mb-7 flex flex-col gap-1.5 text-center lg:text-left">
              <Kicker>{kicker}</Kicker>
              <h1 className="text-title">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {children}
          </Surface>

          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The left half: a poster mosaic lit by the aurora, dissolving into the page
 * behind the tagline. Everything in it is decorative — the panel is hidden
 * from assistive tech's point of view except the brand lockup, because none of
 * it is information you need to sign in.
 */
function ArtworkPanel() {
  const { t } = useLanguage();

  return (
    <aside className="relative isolate hidden overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <PosterMosaic />
      <AuroraBackdrop variant="panel" />
      {/* Scrims: the brand lockup and the tagline both read on the page's own
          background rather than on the wash or the mosaic behind them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-background/70 via-background/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-background via-background/85 to-transparent"
      />

      <div className="relative">
        <Brand size="lg" />
      </div>

      <div className="relative flex max-w-md flex-col gap-6">
        <div aria-hidden className="flex flex-wrap items-center gap-2">
          <Chip variant="outline" size="lg">{t.nav.movies}</Chip>
          <Chip variant="outline" size="lg">{t.nav.series}</Chip>
          <Chip variant="outline" size="lg">{t.nav.categories}</Chip>
        </div>
        <p className="text-display text-balance">{t.auth.brandTagline}</p>
      </div>
    </aside>
  );
}

/**
 * Stand-in artwork built entirely from gradients — no network request, no
 * layout shift, and nothing that can 404 in front of a sign-in form. Rotated
 * off the top-left corner and masked out before it reaches the tagline.
 */
const MOSAIC: { offset: string; tones: [string, string] }[] = [
  { offset: "mt-0", tones: ["from-primary/40 via-primary/15", "from-white/12 via-white/4"] },
  { offset: "mt-14", tones: ["from-info/35 via-info/10", "from-primary/25 via-info/10"] },
  { offset: "mt-4", tones: ["from-premium/22 via-premium/6", "from-info/28 via-primary/10"] },
  { offset: "mt-20", tones: ["from-primary/20 via-white/6", "from-info/20 via-white/5"] },
];

function PosterMosaic() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
      <div className="absolute -top-24 -left-4 flex w-[135%] origin-top-left -rotate-[9deg] gap-5 [mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_82%)]">
        {MOSAIC.map((column) => (
          <div key={column.offset} className={cn("flex flex-1 flex-col gap-5", column.offset)}>
            {column.tones.map((tone) => (
              <div
                key={tone}
                className={cn(
                  "aspect-[2/3] w-full rounded-2xl bg-gradient-to-br to-transparent shadow-e2 ring-1 ring-white/8 ring-inset",
                  tone,
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
