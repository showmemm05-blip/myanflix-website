import { AboutPage } from "@/components/about/AboutPage";
import { tmdbLogoSrc } from "@/lib/credits/tmdb-logo";

/**
 * /about — ABOUT MYANFLIX, with the TMDB credit (owner, 2026-11-06). Public:
 * the footer and Settings › Help & privacy link here.
 *
 * The page itself is the client component in components/about/AboutPage.tsx
 * (its words follow the site language). This file stays a server component
 * for one reason: it looks for the optional TMDB logo file on disk and tells
 * the page whether to draw it (lib/credits/tmdb-logo.ts).
 */
export default function About() {
  return <AboutPage tmdbLogoSrc={tmdbLogoSrc()} />;
}
