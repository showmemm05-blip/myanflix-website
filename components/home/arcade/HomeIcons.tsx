import type { IconProps } from "@/components/system/icons";

/**
 * The category icons drawn on the Home board (Main.dc.html) that the shared
 * icon set does not have: film, TV, book, music, and the three "coming soon"
 * lanes (anime sparkle, podcast mic, live broadcast). Same rules as
 * components/system/icons: 24×24, stroke 1.75, round caps, aria-hidden.
 */
function make(d: string) {
  function HomeIcon({ size = 20, strokeWidth = 1.75, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable={false}
        {...props}
      >
        <path d={d} />
      </svg>
    );
  }
  return HomeIcon;
}

export const FilmIcon = make(
  "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4",
);
export const TvIcon = make(
  "M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5zM8.5 2.5 12 6l3.5-3.5",
);
export const BookIcon = make(
  "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5",
);
export const MusicIcon = make(
  "M9 18V6l11-2v12M4 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0zM15 16a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0z",
);
export const SparkleIcon = make(
  "M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z",
);
export const MicIcon = make("M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7");
export const BroadcastIcon = make(
  "M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0z",
);
