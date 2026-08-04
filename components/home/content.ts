import { Megaphone, Sparkles, Gift, Tv2, Clapperboard, Palette, Captions, Cpu, Rocket, CheckCircle2, Loader2, CircleDashed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Language-independent metadata for placeholder/hybrid Home sections —
 * joined to the translated copy in `lib/i18n/translations.ts` by array
 * index. Keep each list's length in sync with its translation counterpart.
 */

export const announcementIcons: LucideIcon[] = [Megaphone, Sparkles, Gift, Tv2];

export const behindTheScenesImages = [
  "https://picsum.photos/seed/myanflix-bts-1/600/800",
  "https://picsum.photos/seed/myanflix-bts-2/600/800",
  "https://picsum.photos/seed/myanflix-bts-3/600/800",
  "https://picsum.photos/seed/myanflix-bts-4/600/800",
];
export const behindTheScenesIcons: LucideIcon[] = [Clapperboard, Palette, Captions, Cpu];

export const teamAvatarSeeds = ["myanflix-team-1", "myanflix-team-2", "myanflix-team-3", "myanflix-team-4"];

export const partnerInitials = ["GR", "SFC", "YSW", "FWP", "SLD"];

export const testimonialAvatarSeeds = [
  "myanflix-voice-1",
  "myanflix-voice-2",
  "myanflix-voice-3",
  "myanflix-voice-4",
];

export const newsImages = [
  "https://picsum.photos/seed/myanflix-news-1/700/420",
  "https://picsum.photos/seed/myanflix-news-2/700/420",
  "https://picsum.photos/seed/myanflix-news-3/700/420",
];

export const roadmapStatusIcons: Record<string, LucideIcon> = {
  shipped: CheckCircle2,
  inProgress: Loader2,
  upcoming: CircleDashed,
};

export const ctaIcons = { movies: Clapperboard, series: Tv2, categories: Rocket };
