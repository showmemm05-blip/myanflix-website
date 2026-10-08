"use client";

import { Row, RowSkeleton } from "@/components/system/Row";
import { MediaCard } from "@/components/system/MediaCard";
import type { BrowseItem } from "./browse-item";

/**
 * A row of poster cards (SHELL.md rows): the standard Marquee <Row> header —
 * title, optional subtitle, crimson "See all", desktop-only arrows that fade
 * in on hover/focus — over a full-bleed rail that starts on the page gutter.
 *
 * Rows carry their own gutter, so put this straight in the page, not inside a
 * padded box. Renders nothing once loaded with no items.
 */
export function PosterRail({
  title,
  subtitle,
  items,
  isLoading,
  viewAllHref,
  className,
}: {
  title: string;
  subtitle?: string;
  items: BrowseItem[];
  isLoading?: boolean;
  viewAllHref?: string;
  className?: string;
}) {
  if (isLoading) return <RowSkeleton kind="poster" className={className} />;
  if (items.length === 0) return null;

  return (
    <Row title={title} subtitle={subtitle} seeAllHref={viewAllHref} className={className}>
      {items.map((item) => (
        <MediaCard key={item.id} item={item} layout="rail" sizes="(max-width: 719px) 128px, 184px" />
      ))}
    </Row>
  );
}
