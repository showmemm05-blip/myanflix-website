import Link from "next/link";

import { useLanguage } from "@/lib/context/language-context";
import { Button } from "@/components/ui/button";
import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";
import { Surface } from "@/components/system/Surface";
import { RevealSection } from "./RevealSection";
import { ctaIcons } from "./content";

/** Closing band — real internal links only. */
export function HomeCta() {
  const { t } = useLanguage();
  const MediaIcon = ctaIcons.media;
  const CategoriesIcon = ctaIcons.categories;

  return (
    <RevealSection className="px-4 sm:px-6 lg:px-8">
      {/* The page opened on aurora light; it closes on it too. The band is the
          standard Surface at the full-width radius — the aurora behind it is
          the only thing making it special, not a one-off box. */}
      <Surface
        as="section"
        radius="3xl"
        className="isolate overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-20"
      >
        <AuroraBackdrop variant="panel" />
        <h2 className="text-title">{t.home.cta.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-body-muted">{t.home.cta.subtitle}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button variant="onArt" size="pill" render={<Link href="/movies" />} nativeButton={false}>
            <MediaIcon className="size-4" />
            {t.home.cta.browseMedia}
          </Button>
          <Button
            size="pill"
            variant="ghost"
            className="bg-white/8 font-semibold text-white ring-1 ring-white/15 backdrop-blur-md ring-inset hover:bg-white/15 hover:text-white active:scale-[0.98]"
            render={<Link href="/movies?tab=movies" />}
            nativeButton={false}
          >
            <CategoriesIcon className="size-4" />
            {t.home.cta.exploreCategories}
          </Button>
        </div>
      </Surface>
    </RevealSection>
  );
}
