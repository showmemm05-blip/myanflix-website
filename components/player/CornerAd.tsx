"use client";

import { memo, useEffect, useState } from "react";
import { CloseIcon } from "@/components/system";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { cn } from "@/lib/utils";

/** How long a picture may stay in view without loading before the showing counts as failed. */
const PICTURE_LOAD_DEADLINE_MS = 15_000;

interface CornerAdProps {
  /** Absolute picture URL (PNG / JPG / WebP / GIF — an animation plays as it is). */
  imageUrl: string;
  title: string;
  /** A plain http(s) address (safeAdLink), or null for a picture with no link. */
  linkUrl: string | null;
  closable: boolean;
  /** Whether it may be seen right now (tab in front, playing, no ad, no menu…). */
  visible: boolean;
  /** The player's controls are up: the picture shrinks so it ends above the centre buttons. */
  controlsShown: boolean;
  /** A tap on the link — the page pauses the movie and counts the tap. */
  onOpen: () => void;
  /** ✕ — gone for the rest of this viewing. */
  onClose: () => void;
  /** Visible with the picture loaded: the page sends the impression (or `shown` for a later showing). */
  onVisibleLoaded: () => void;
  /** The picture could not load: the page reports it and turns the corner off. */
  onError: () => void;
}

/**
 * The corner advertisement (lib/player/corner.ts): a small picture under the
 * connection disc in the top-right while the movie plays — 84 px down, so it
 * and its ✕ (with the ✕'s larger touch area) start below the controls' top
 * row; with the controls up it also shrinks to end above the centre buttons,
 * so it never sits over a control. The page mounts it for one
 * showing at a time (the picture loads when it first shows) and fades it out
 * and back as `visible` changes. The size is capped by the stage itself:
 * at most 30% of its width (280 px) and 20% of its height (96 px), the
 * picture keeping its own shape.
 */
export const CornerAd = memo(function CornerAd({
  imageUrl,
  title,
  linkUrl,
  closable,
  visible,
  controlsShown,
  onOpen,
  onClose,
  onVisibleLoaded,
  onError,
}: CornerAdProps) {
  const p = useSection(playText);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (visible && loaded) onVisibleLoaded();
  }, [visible, loaded, onVisibleLoaded]);

  // A picture that neither loads nor errors (a host that holds the request
  // open) would hold this showing forever — its seconds only count once it
  // appears. After this long in view it counts as failed.
  useEffect(() => {
    if (!visible || loaded) return;
    const timer = setTimeout(onError, PICTURE_LOAD_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [visible, loaded, onError]);

  const shown = visible && loaded;

  const picture = (
    // Plain <img> on purpose: the picture comes from the media host as is
    // (an animated GIF / WebP must stay animated), and it is tiny.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={linkUrl ? "" : title}
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={cn(
        "block h-auto w-auto max-w-[min(30cqw,280px)] rounded-[8px]",
        // With the controls up it ends above the centre buttons (half the
        // stage less its own 84 px top and a 40 px clearance).
        controlsShown ? "max-h-[min(20cqh,96px,calc(50cqh_-_124px))]" : "max-h-[min(20cqh,96px)]",
      )}
    />
  );

  return (
    // The stage's size, as a query container: the picture's caps are shares of it.
    <div aria-hidden={shown ? undefined : true} className="pointer-events-none absolute inset-0 [container-type:size]">
      <div
        className={cn(
          "absolute top-[84px] right-[clamp(16px,2.5vw,32px)] transition-[opacity,translate,visibility] duration-300 ease-out",
          shown ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="pointer-events-auto relative rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          {linkUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={onOpen}
              aria-label={p.openAd(title)}
              className="block rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
            >
              {picture}
            </a>
          ) : (
            picture
          )}
          <span className="pointer-events-none absolute bottom-1 left-1 rounded-[4px] bg-black/70 px-1 text-[10px] leading-4 font-extrabold tracking-[0.06em] text-fg uppercase [&:lang(my)]:tracking-normal">
            {p.adTag}
          </span>
          {closable && (
            <button
              type="button"
              onClick={onClose}
              aria-label={p.closeAd}
              title={p.closeAd}
              className={cn(
                "absolute -top-2.5 -right-2.5 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-art-badge text-fg outline-none backdrop-blur-[14px]",
                "transition-[background-color,transform] duration-150 hover:bg-white/24 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
                // A 6-unit disc on the picture, a finger-sized target around it.
                "before:absolute before:-inset-2.5 before:content-['']",
              )}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
