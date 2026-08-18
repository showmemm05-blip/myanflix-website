import Image from "next/image";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { RevealSection } from "./RevealSection";
import { SectionHeading } from "./SectionHeading";
import { behindTheScenesImages, behindTheScenesIcons } from "./content";

/**
 * PLACEHOLDER — captioned image gallery, laid out as the page's ASYMMETRIC
 * FEATURE BLOCK: one large lead image with the rest stacked beside it, so the
 * home page has editorial rhythm instead of another equal-weight grid. On
 * phones the lead goes full width and the rest sit in a row beneath it.
 */
export function BehindTheScenes() {
  const { t } = useLanguage();
  const items = t.home.behindTheScenes.items;

  return (
    <RevealSection className="flex flex-col gap-5">
      <SectionHeading
        eyebrow={t.home.behindTheScenes.eyebrow}
        title={t.home.behindTheScenes.title}
        subtitle={t.home.behindTheScenes.subtitle}
      />
      <div className="grid grid-cols-3 gap-3 px-4 sm:px-6 lg:grid-cols-3 lg:grid-rows-3 lg:px-8">
        {items.map((item, i) => {
          const Icon = behindTheScenesIcons[i % behindTheScenesIcons.length];
          const lead = i === 0;
          return (
            <RevealSection
              key={item.caption}
              as="div"
              delay={Math.min(i * 0.06, 0.4)}
              className={cn(
                "group relative isolate overflow-hidden rounded-3xl bg-muted",
                lead
                  ? "col-span-3 aspect-16/10 lg:col-span-2 lg:row-span-3 lg:aspect-auto"
                  : "aspect-3/4 lg:aspect-auto lg:min-h-36",
              )}
            >
              <Image
                src={behindTheScenesImages[i % behindTheScenesImages.length]}
                alt={item.caption}
                fill
                sizes={
                  lead
                    ? "(max-width: 1024px) 100vw, 66vw"
                    : "(max-width: 1024px) 33vw, 33vw"
                }
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/12 ring-inset"
              />
              <div className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-1", lead ? "p-5 sm:p-6" : "p-3")}>
                <Icon className={cn("text-primary", lead ? "size-5" : "size-4")} />
                <p
                  className={cn(
                    "font-heading font-semibold text-white",
                    lead ? "text-lg tracking-tight sm:text-xl" : "text-sm",
                  )}
                >
                  {item.caption}
                </p>
                <p className={cn("line-clamp-2 text-white/70", lead ? "max-w-md text-sm" : "text-xs")}>
                  {item.description}
                </p>
              </div>
            </RevealSection>
          );
        })}
      </div>
    </RevealSection>
  );
}
