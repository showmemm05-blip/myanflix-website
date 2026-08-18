import Image from "next/image";

import { Chip } from "@/components/system/Chip";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { newsImages } from "./content";

/** PLACEHOLDER — news/article beat. */
export function NewsArticles() {
  const { t } = useLanguage();
  const items = t.home.news.items;

  return (
    <RevealSection className="flex flex-col gap-5">
      <SectionHeading eyebrow={t.home.news.eyebrow} title={t.home.news.title} subtitle={t.home.news.subtitle} />
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {items.map((item, i) => (
          <RevealSection
            key={item.title}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            className="surface group flex flex-col overflow-hidden transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-card/70"
          >
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={newsImages[i % newsImages.length]}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
              />
              <Chip
                tone="neutral"
                variant="outline"
                size="sm"
                className="absolute top-3 left-3 bg-black/45 text-white backdrop-blur-md"
              >
                {item.tag}
              </Chip>
            </div>
            <div className="flex flex-col gap-2 px-4 py-4">
              <span className="text-kicker">{item.date}</span>
              <p className="font-heading text-sm leading-snug font-semibold tracking-tight">{item.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
