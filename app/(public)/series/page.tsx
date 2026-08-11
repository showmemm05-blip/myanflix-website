import { redirect } from "next/navigation";

export default function SeriesRedirectPage() {
  redirect("/movies?tab=series");
}
