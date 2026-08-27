import { BooksView } from "@/components/media/BooksView";
import { MediaPageTransition } from "@/components/media/MediaPageTransition";

/** /media/books — the digital bookstore (preview catalog until the books API ships). */
export default function MediaBooksPage() {
  return (
    <MediaPageTransition>
      <BooksView />
    </MediaPageTransition>
  );
}
