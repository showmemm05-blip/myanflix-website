"use client";

import { HomeBanner } from "@/components/home/HomeBanner";
import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { BehindTheScenes } from "@/components/home/BehindTheScenes";
import { TeamSpotlight } from "@/components/home/TeamSpotlight";
import { PartnerStrip } from "@/components/home/PartnerStrip";
import { CommunityTestimonials } from "@/components/home/CommunityTestimonials";
import { NewsArticles } from "@/components/home/NewsArticles";
import { RoadmapTimeline } from "@/components/home/RoadmapTimeline";
import { HomeCta } from "@/components/home/HomeCta";

/**
 * THE EDITORIAL LANDING.
 *
 * Reading order is deliberate: the aurora hero states what this is, the
 * announcement marquee says what changed, the asymmetric feature block (Behind
 * the Scenes) is the one big visual moment, then the supporting sections —
 * people, partners, community, stories, roadmap — run at an even rhythm before
 * the closing call to action.
 *
 * The generous, growing gap between sections is the point: one idea per screen
 * region, with enough air that the eye never has to decide which of two things
 * to read first.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-24 sm:gap-24">
      <HomeBanner />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-16 sm:gap-24">
        <AnnouncementBanner />
        <BehindTheScenes />
        <TeamSpotlight />
        <PartnerStrip />
        <CommunityTestimonials />
        <NewsArticles />
        <RoadmapTimeline />
        <HomeCta />
      </div>
    </div>
  );
}
