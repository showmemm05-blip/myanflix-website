/**
 * MARQUEE — the shared design system for the MyanFlix website.
 * Import from "@/components/system". See FOUNDATION.md for the API.
 */
export * from "./icons";
export { FallbackArt, artPalette, type FallbackArtVariant, type ArtPalette } from "./FallbackArt";
export { Artwork } from "./Artwork";
export { Surface, surfaceVariants } from "./Surface";
export { Kicker } from "./Kicker";
export { SectionHeader } from "./SectionHeader";
export {
  Chip,
  chipClass,
  FilterChip,
  filterChipClass,
  RemovableChip,
  type ChipTone,
  type ChipVariant,
  type ChipOptions,
} from "./Chip";
export { Tag, CountBadge, Rating, type TagKind } from "./Tag";
export { SegmentedControl, type SegmentOption } from "./SegmentedControl";
export { LanguageSwitch } from "./LanguageSwitch";
export { Field, FieldHelp, FieldError, SearchField, fieldClass, type FieldControlProps } from "./Field";
export { Modal } from "./Modal";
export { HeroShell, HeroTags, HeroTitle, HeroMeta, HeroSynopsis, HeroActions, HeroPager } from "./Hero";
export { Row, RowStack, Rail, RowSkeleton, CardGrid, GridLoadingMore } from "./Row";
export { AccessBadge } from "./AccessBadge";
export { MediaCard } from "./MediaCard";
export {
  isActiveHref,
  activeShellTab,
  SHELL_TAB_HREF,
  type NavDestination,
  type ShellTab,
} from "./nav";
