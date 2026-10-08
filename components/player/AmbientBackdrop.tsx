"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { FallbackArt } from "@/components/system";

/** Deliberately tiny: upscaling this to viewport size is itself most of the blur, so the
 *  GPU filter that follows has far less work to do than blurring a full-resolution frame. */
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 18;
/** Once a second: the layers' 1 s opacity transition already smooths the colour
 *  between samples, and each redraw makes the GPU re-filter a full-screen 64px blur. */
const SAMPLE_INTERVAL_MS = 1000;

interface AmbientBackdropProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Shown before the first frame lands, and permanently if the canvas can't read the video. */
  posterUrl: string | null;
  /** Seed for the fallback scene when the title has no cover (usually the title). */
  seed: string;
  /** Sampling only makes sense once frames actually exist. */
  active: boolean;
}

/**
 * Bathes the page in light pulled from whatever is on screen — the wash a real
 * projector throws onto the wall around it. The live frame is sampled into a
 * 32×18 canvas once a second and blown up behind the stage, so the colour
 * tracks the film shot for shot instead of sitting on one static tint.
 *
 * Two things can stop that. A hidden tab has no frames worth reading. And a
 * cross-origin source can taint the canvas — the element now carries
 * `crossOrigin="anonymous"` and the cache server answers with
 * `Access-Control-Allow-Origin: *`, so Safari's native HLS path reads fine too
 * (hls.js's MSE blob was always same-origin), but a deployment serving streams
 * without those headers would land back in the catch below. Both fall back to
 * the blurred cover art, which carries the same effect minus the
 * frame-accuracy — so the design never depends on the sampling succeeding.
 */
export function AmbientBackdrop({ videoRef, posterUrl, seed, active }: AmbientBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasFrame, setHasFrame] = useState(false);
  // Derived rather than stored, so leaving playback flips back to the poster wash
  // without an effect having to reset anything.
  const isSampling = active && hasFrame;

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: false });
    if (!canvas || !context) return;

    let cancelled = false;

    const drawFrame = () => {
      if (cancelled) return;
      const video = videoRef.current;
      // readyState < HAVE_CURRENT_DATA means there is no frame to copy yet.
      if (!video || video.readyState < 2 || document.hidden) return;
      try {
        context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        setHasFrame(true);
      } catch {
        // Tainted canvas (cross-origin source) — stop trying and keep the poster wash.
        cancelled = true;
        setHasFrame(false);
      }
    };

    // First draw goes through rAF rather than running inline, so the very first
    // frame still lands promptly without setting state from the effect body.
    const firstDraw = requestAnimationFrame(drawFrame);
    const interval = setInterval(drawFrame, SAMPLE_INTERVAL_MS);
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstDraw);
      clearInterval(interval);
    };
  }, [active, videoRef]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ground">
      {/* One drift animation moves both layers together, so they stay exactly in
          step through the cross-fade (two separate animations could drift apart
          once one was paused) and the browser runs one animation instead of two.
          The drift is off entirely under prefers-reduced-motion (globals.css). */}
      <div className="animate-ambient-drift absolute inset-0">
        {/* Poster wash: the base layer always present, cross-faded under the live
            sample so the transition into playback is a colour shift, not a pop. */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${isSampling ? "opacity-0" : "opacity-100"}`}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-110 object-cover blur-[64px] saturate-[2.2] brightness-110"
            />
          ) : (
            <FallbackArt seed={seed} variant="hero" className="scale-110 blur-[64px] saturate-[2.2]" />
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={SAMPLE_WIDTH}
          height={SAMPLE_HEIGHT}
          className={`absolute inset-0 size-full object-cover blur-[64px] saturate-[2.2] brightness-110 transition-opacity duration-1000 ${
            isSampling ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Holds the wash to a suggestion of colour. Pushing saturation up on the
          layers above and keeping this scrim heavy is deliberate: it buys visible
          hue without lifting luminance, so body text keeps its contrast against
          even the brightest frames. */}
      <div className="absolute inset-0 bg-ground/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-ground/55 via-transparent to-ground" />
    </div>
  );
}
