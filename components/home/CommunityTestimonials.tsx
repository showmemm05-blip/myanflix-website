import { Quote } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { testimonialAvatarSeeds } from "./content";

/** PLACEHOLDER — merges "community activities" + "user stories/testimonials" into one quote-card format. */
export function CommunityTestimonials() {
  const { t } = useLanguage();
  const items = t.home.testimonials.items;

  return (
    <RevealSection className="flex flex-col gap-4">
      <SectionHeading
        eyebrow={t.home.testimonials.eyebrow}
        title={t.home.testimonials.title}
        subtitle={t.home.testimonials.subtitle}
      />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        {items.map((item, i) => (
          <RevealSection
            key={item.name}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            className="glass-card flex flex-col gap-3 rounded-xl px-5 py-4"
          >
            <Quote className="size-5 text-primary/60" />
            <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{item.quote}&rdquo;</p>
            <div className="flex items-center gap-2.5 pt-1">
              <Avatar size="sm">
                <AvatarImage
                  src={`https://i.pravatar.cc/120?u=${testimonialAvatarSeeds[i % testimonialAvatarSeeds.length]}`}
                  alt={item.name}
                />
                <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.role}</p>
              </div>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
