"use client";

import { motion } from "framer-motion";
import { CircleDashed } from "lucide-react";

import { Chip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { roadmapStatusIcons } from "./content";

/** The tone each roadmap state wears: done is emerald, in-flight violet, later grey. */
const STATUS_TONE: Record<string, "success" | "primary" | "neutral"> = {
  shipped: "success",
  inProgress: "primary",
  upcoming: "neutral",
};

/** PLACEHOLDER — merges "upcoming projects/events" + "future plans/roadmap"; vertical on mobile/tablet, horizontal at lg. */
export function RoadmapTimeline() {
  const { t } = useLanguage();
  const items = t.home.roadmap.items;

  return (
    <RevealSection className="flex flex-col gap-6">
      <SectionHeading eyebrow={t.home.roadmap.eyebrow} title={t.home.roadmap.title} subtitle={t.home.roadmap.subtitle} />
      <div className="relative px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-1 bottom-1 left-[27px] w-px origin-top bg-border sm:left-[35px] lg:hidden"
        />
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-[11px] right-8 left-8 hidden h-px origin-left bg-border lg:block"
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-5">
          {items.map((item, i) => {
            const Icon = roadmapStatusIcons[item.status] ?? CircleDashed;
            const tone = STATUS_TONE[item.status] ?? "neutral";
            return (
              <RevealSection
                key={item.title}
                as="div"
                delay={Math.min(i * 0.08, 0.4)}
                className="relative flex gap-3 lg:flex-1 lg:flex-col lg:gap-3"
              >
                <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-2 ring-primary">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <Chip tone={tone} variant="outline" size="sm" className="mb-2 uppercase">
                    {item.period}
                  </Chip>
                  <p className="font-heading text-sm font-semibold tracking-tight">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </RevealSection>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
