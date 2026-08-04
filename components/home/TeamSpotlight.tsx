import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { teamAvatarSeeds } from "./content";

/** PLACEHOLDER — team/creator card grid. */
export function TeamSpotlight() {
  const { t } = useLanguage();
  const members = t.home.team.members;

  return (
    <RevealSection className="flex flex-col gap-4">
      <SectionHeading eyebrow={t.home.team.eyebrow} title={t.home.team.title} subtitle={t.home.team.subtitle} />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {members.map((member, i) => (
          <RevealSection
            key={member.name}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            className="glass-card flex flex-col items-center gap-3 rounded-xl px-5 py-6 text-center"
          >
            <Avatar size="lg">
              <AvatarImage
                src={`https://i.pravatar.cc/160?u=${teamAvatarSeeds[i % teamAvatarSeeds.length]}`}
                alt={member.name}
              />
              <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-heading text-sm font-semibold">{member.name}</p>
              <p className="text-xs font-medium text-primary">{member.role}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{member.bio}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
