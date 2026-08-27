import { redirect } from "next/navigation";

export default function SeriesRedirectPage() {
  redirect("/media/movies?type=series");
}
