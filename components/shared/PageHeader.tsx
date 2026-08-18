import type { ReactNode } from "react";

import { SectionHeader } from "@/components/system/SectionHeader";

/**
 * Header anatomy for account/finance pages: eyebrow · title · subtitle with an
 * action cluster that drops below the text on phones instead of squeezing it.
 *
 * A thin adapter over the system's <SectionHeader> so page headers and section
 * headers share one rhythm — same eyebrow (the default muted grey, as
 * everywhere else in the app), same spacing, same action slot.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <SectionHeader
      as="h1"
      size="page"
      kicker={eyebrow}
      title={title}
      description={subtitle}
      action={actions}
    />
  );
}
