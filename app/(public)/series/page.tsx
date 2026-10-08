import { redirect } from "next/navigation";

/** Old /series links land on the Series hub (the Media chip strip's Series chip). */
export default function SeriesRedirectPage() {
  redirect("/media/movies?tab=series");
}
