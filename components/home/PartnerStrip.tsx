import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { partnerInitials } from "./content";

/** PLACEHOLDER — partner organization badge strip; horizontal scroll on mobile, wraps to a static row at lg. */
export function PartnerStrip() {
  const { t } = useLanguage();
  const items = t.home.partners.items;

  return (
    <RevealSection className="flex flex-col gap-5">
      <SectionHeading eyebrow={t.home.partners.eyebrow} title={t.home.partners.title} subtitle={t.home.partners.subtitle} />
      <div className="scrollbar-none fade-edge-x flex gap-3 overflow-x-auto px-4 pb-1 sm:px-6 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-8">
        {items.map((partner, i) => (
          <div
            key={partner.name}
            className="surface flex min-w-[208px] shrink-0 items-center gap-3 px-4 py-3.5 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-card/70 lg:min-w-[224px] lg:shrink"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25 ring-inset">
              {partnerInitials[i % partnerInitials.length]}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold tracking-tight">{partner.name}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{partner.description}</p>
            </div>
          </div>
        ))}
      </div>
    </RevealSection>
  );
}
