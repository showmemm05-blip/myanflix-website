"use client";

import { Button } from "@/components/ui/button";
import { CloudOffIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { EmptyState } from "./EmptyState";

/**
 * MARQUEE ERROR STATE: the empty-state layout with a red disc and the
 * cloud-off icon, "Something went wrong" and a white Retry button. Before
 * this existed, API failures silently rendered as empty lists — every failed
 * query should show it.
 *
 * The second line appears only when the caller gives one: not every failure
 * is the connection's fault. For a request that could not reach the server,
 * pass the board's line: `useSection(shellText).errorBody`
 * ("Check your connection and try again.", with real Burmese).
 */
export function ErrorState({
  title,
  description,
  onRetry,
  framed = false,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  framed?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const s = useSection(shellText);
  return (
    <div role="alert" className={className}>
      <EmptyState
        icon={CloudOffIcon}
        tone="danger"
        framed={framed}
        title={title ?? s.errorTitle}
        description={description}
        action={
          onRetry && (
            <Button variant="play" size="cta" className="px-7" onClick={onRetry}>
              {t.common.retry}
            </Button>
          )
        }
      />
    </div>
  );
}
