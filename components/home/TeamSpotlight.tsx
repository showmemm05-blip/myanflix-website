import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kicker } from "@/components/system/Kicker";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";

/** PLACEHOLDER — team/creator card grid. */
export function TeamSpotlight() {
  const { t } = useLanguage();
  const members = t.home.team.members;

  return (
    <RevealSection className="flex flex-col gap-5">
      <SectionHeading eyebrow={t.home.team.eyebrow} title={t.home.team.title} subtitle={t.home.team.subtitle} />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {members.map((member, i) => (
          <RevealSection
            key={member.name}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            // The `surface` utility is the Surface panel's look; RevealSection
            // owns the element, so the panel is applied as classes rather than
            // by nesting a second box inside it.
            className="surface flex flex-col items-center gap-3 px-5 py-6 text-center transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-card/70"
          >
            <Avatar size="lg">
              <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-heading text-sm font-semibold tracking-tight">{member.name}</p>
              <Kicker className="mt-1">{member.role}</Kicker>
              <p className="mt-2 text-xs text-muted-foreground">{member.bio}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
