import Image from "next/image";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { behindTheScenesImages, behindTheScenesIcons } from "./content";

/** PLACEHOLDER — captioned image gallery. */
export function BehindTheScenes() {
  const { t } = useLanguage();
  const items = t.home.behindTheScenes.items;

  return (
    <RevealSection className="flex flex-col gap-4">
      <SectionHeading
        eyebrow={t.home.behindTheScenes.eyebrow}
        title={t.home.behindTheScenes.title}
        subtitle={t.home.behindTheScenes.subtitle}
      />
      <div className="grid grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map((item, i) => {
          const Icon = behindTheScenesIcons[i % behindTheScenesIcons.length];
          return (
            <RevealSection
              key={item.caption}
              as="div"
              delay={Math.min(i * 0.06, 0.4)}
              className="group relative aspect-3/4 overflow-hidden rounded-xl border border-white/[0.08] bg-muted"
            >
              <Image
                src={behindTheScenesImages[i % behindTheScenesImages.length]}
                alt={item.caption}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
                <Icon className="size-4 text-primary" />
                <p className="text-sm font-semibold text-white">{item.caption}</p>
                <p className="line-clamp-2 text-xs text-white/70">{item.description}</p>
              </div>
            </RevealSection>
          );
        })}
      </div>
    </RevealSection>
  );
}
