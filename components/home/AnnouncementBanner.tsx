"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";

import { Surface } from "@/components/system/Surface";
import { Chip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { announcementIcons } from "./content";

/**
 * PLACEHOLDER — auto-scrolling marquee of announcements/promotions/new-product copy.
 *
 * A 32-second loop that never stops is a hazard for anyone who reads slowly or
 * is bothered by motion, so:
 *  - `prefers-reduced-motion` turns the marquee off entirely — the strip stays,
 *    it simply becomes a scrollable row of cards with no animation at all;
 *  - otherwise it pauses on hover AND on keyboard focus, and carries a real
 *    pause/play button so the pause is reachable without a pointer.
 */
export function AnnouncementBanner() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  /** Explicit user intent from the button — outranks hover/focus. */
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const controls = useAnimationControls();
  const items = t.home.announcements.items;
  // The track is doubled so the -50% loop lands seamlessly. With motion off
  // there is no loop to hide, so one copy is enough — a screen reader (and a
  // scrollbar) shouldn't get every announcement twice for nothing.
  const track = reduceMotion ? items : [...items, ...items];
  const running = playing && !hovered && !reduceMotion;

  useEffect(() => {
    if (!running) {
      controls.stop();
      return;
    }
    controls.start({ x: ["0%", "-50%"], transition: { duration: 32, repeat: Infinity, ease: "linear" } });
  }, [running, controls]);

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {!reduceMotion && (
        <div className="mb-2.5 flex justify-end px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            aria-label={playing ? t.home.announcements.pause : t.home.announcements.resume}
            title={playing ? t.home.announcements.pause : t.home.announcements.resume}
            className="focus-ring flex size-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10 transition-colors duration-150 ease-out ring-inset hover:bg-white/10 hover:text-foreground"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        </div>
      )}

      <div className="scrollbar-none overflow-x-auto px-4 sm:px-6 lg:px-8">
        <motion.div animate={controls} className="flex w-max gap-3">
          {track.map((item, i) => {
            const Icon = announcementIcons[i % announcementIcons.length];
            return (
              <Surface
                key={i}
                interactive
                className="flex max-w-[320px] min-w-[248px] shrink-0 items-start gap-3 px-4 py-3.5 sm:min-w-[288px]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/15 text-info ring-1 ring-info/25 ring-inset">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <Chip tone="info" size="sm" className="mb-1.5 uppercase">
                    {item.badge}
                  </Chip>
                  <p className="font-heading text-sm leading-snug font-semibold">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.text}</p>
                </div>
              </Surface>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
