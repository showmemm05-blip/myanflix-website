import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { partnerInitials } from "./content";

/** PLACEHOLDER — partner organization badge strip; horizontal scroll on mobile, wraps to a static row at lg. */
export function PartnerStrip() {
  const { t } = useLanguage();
  const items = t.home.partners.items;

  return (
    <RevealSection className="flex flex-col gap-4">
      <SectionHeading eyebrow={t.home.partners.eyebrow} title={t.home.partners.title} subtitle={t.home.partners.subtitle} />
      <div className="scrollbar-none fade-edge-x flex gap-3 overflow-x-auto px-4 pb-1 sm:px-6 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-8">
        {items.map((partner, i) => (
          <div
            key={partner.name}
            className="glass-card flex min-w-[200px] shrink-0 items-center gap-3 rounded-xl px-4 py-3 lg:min-w-[220px] lg:shrink"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {partnerInitials[i % partnerInitials.length]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{partner.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{partner.description}</p>
            </div>
          </div>
        ))}
      </div>
    </RevealSection>
  );
}
