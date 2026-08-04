import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/context/language-context";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { newsImages } from "./content";

/** PLACEHOLDER — news/article beat. */
export function NewsArticles() {
  const { t } = useLanguage();
  const items = t.home.news.items;

  return (
    <RevealSection className="flex flex-col gap-4">
      <SectionHeading eyebrow={t.home.news.eyebrow} title={t.home.news.title} subtitle={t.home.news.subtitle} />
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        {items.map((item, i) => (
          <RevealSection
            key={item.title}
            as="div"
            delay={Math.min(i * 0.06, 0.4)}
            className="glass-card flex flex-col gap-3 overflow-hidden rounded-xl"
          >
            <div className="relative aspect-video">
              <Image
                src={newsImages[i % newsImages.length]}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.tag}</Badge>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
              <p className="font-heading text-sm font-semibold leading-snug">{item.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </RevealSection>
  );
}
