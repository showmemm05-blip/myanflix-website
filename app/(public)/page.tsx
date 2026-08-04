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

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <HomeBanner />

      <div className="flex flex-col gap-10">
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
