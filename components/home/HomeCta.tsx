import Link from "next/link";
import { useLanguage } from "@/lib/context/language-context";
import { Button } from "@/components/ui/button";
import { RevealSection } from "./RevealSection";
import { ctaIcons } from "./content";

/** Closing band — real internal links only. */
export function HomeCta() {
  const { t } = useLanguage();
  const MediaIcon = ctaIcons.media;
  const CategoriesIcon = ctaIcons.categories;

  return (
    <RevealSection className="px-4 sm:px-6 lg:px-8">
      <div className="glass-card glow-primary relative overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-10 sm:py-16">
        <h2 className="text-gradient-brand font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {t.home.cta.title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{t.home.cta.subtitle}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/movies" />} nativeButton={false}>
            <MediaIcon className="size-4" />
            {t.home.cta.browseMedia}
          </Button>
          <Button size="lg" variant="ghost" render={<Link href="/categories" />} nativeButton={false}>
            <CategoriesIcon className="size-4" />
            {t.home.cta.exploreCategories}
          </Button>
        </div>
      </div>
    </RevealSection>
  );
}
