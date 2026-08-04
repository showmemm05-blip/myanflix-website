"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useLanguage } from "@/lib/context/language-context";
import { announcementIcons } from "./content";

/** PLACEHOLDER — auto-scrolling marquee of announcements/promotions/new-product copy. */
export function AnnouncementBanner() {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const controls = useAnimationControls();
  const items = t.home.announcements.items;
  const track = [...items, ...items];

  useEffect(() => {
    if (paused) {
      controls.stop();
    } else {
      controls.start({ x: ["0%", "-50%"], transition: { duration: 32, repeat: Infinity, ease: "linear" } });
    }
  }, [paused, controls]);

  return (
    <section
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div animate={controls} className="flex w-max gap-4 px-4 sm:px-6 lg:px-8">
        {track.map((item, i) => {
          const Icon = announcementIcons[i % announcementIcons.length];
          return (
            <div
              key={i}
              className="glass-card flex min-w-[240px] max-w-[320px] shrink-0 items-start gap-3 rounded-xl px-4 py-3 sm:min-w-[280px]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="mb-1 inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  {item.badge}
                </span>
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.text}</p>
              </div>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}
