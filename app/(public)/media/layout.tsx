/**
 * THE MEDIA SECTION SHELL.
 *
 * The Marquee app shell draws the Media chip strip (Movies · Series · Books ·
 * Categories | Music SOON) inside its sticky top bar on every /media page —
 * see components/layout/MediaChipStrip.tsx — so this layout only gives the
 * hub pages a full-height column. Each hub page brings its own hero (pulled
 * up under the bar and strip with `under-bar`) or its own page title.
 */
export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative flex min-h-[70vh] flex-1 flex-col">{children}</div>;
}
