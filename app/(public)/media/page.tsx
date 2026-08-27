import { AllMediaView } from "@/components/media/AllMediaView";
import { MediaPageTransition } from "@/components/media/MediaPageTransition";

/** /media — the organized overview of every medium: featured picks, then one shelf each. */
export default function AllMediaPage() {
  return (
    <MediaPageTransition>
      <AllMediaView />
    </MediaPageTransition>
  );
}
