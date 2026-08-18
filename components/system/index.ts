/**
 * AURORA THEATER — the shared design system.
 *
 * Every page in the app composes from these; nothing here knows about a
 * specific route. Import from "@/components/system".
 */
export { Surface, surfaceVariants } from "./Surface";
export { Kicker } from "./Kicker";
export { SectionHeader } from "./SectionHeader";
export { AuroraBackdrop } from "./AuroraBackdrop";
export { StatTile } from "./StatTile";
export { Chip, chipClass, type ChipTone, type ChipVariant, type ChipOptions } from "./Chip";
export { AccessBadge } from "./AccessBadge";
export { MediaCard, MediaCardSkeleton } from "./MediaCard";
export { SideRail } from "./SideRail";
export { TabBar, type TabBarItem } from "./TabBar";
export { TopBar } from "./TopBar";
export { isActiveHref, type NavDestination } from "./nav";
