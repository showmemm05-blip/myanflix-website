import { MediaPageTransition } from "@/components/media/MediaPageTransition";
import { MusicView } from "@/components/media/MusicView";

/** /media/music — album sleeves and a track list (preview catalog until the music API ships). */
export default function MediaMusicPage() {
  return (
    <MediaPageTransition>
      <MusicView />
    </MediaPageTransition>
  );
}
