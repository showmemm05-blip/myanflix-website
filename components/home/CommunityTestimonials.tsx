import { Quote } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/context/language-context";
import { PeakViewersChip } from "./PeakViewersChip";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";

/** PLACEHOLDER — merges "community activities" + "user stories/testimonials" into one quote-card format. */
export function CommunityTestimonials() {
  const { t } = useLanguage();
  const items = t.home.testimonials.items;

  return (
    <RevealSection className="flex flex-col gap-5">
      <SectionHeading
        eyebrow={t.home.testimonials.eyebrow}
        title={t.home.testimonials.title}
        subtitle={t.home.testimonials.subtitle}
        action={<PeakViewersChip />}
      />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        {items.map((item, i) => (
          <RevealSection
            key={item.name}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            className="surface flex flex-col gap-3 px-5 py-5 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-card/70"
          >
            <Quote className="size-5 shrink-0 text-primary/60" />
            <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{item.quote}&rdquo;</p>
            <div className="mt-auto flex items-center gap-2.5 pt-1">
              <Avatar size="sm">
                <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{item.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.role}</p>
              </div>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
