import { redirect } from "next/navigation";

/**
 * The catalog moved to /media (with /media/movies, /media/books and
 * /media/music under it). Old /movies links — including the ?tab= deep links
 * the previous browse surface wrote — land on the equivalent new address.
 */
export default async function MoviesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;

  if (tab === "books") redirect("/media/books");
  if (tab === "music") redirect("/media/music");

  const target = new URLSearchParams();
  if (tab === "series") target.set("type", "series");
  if (q) target.set("q", q);
  const qs = target.toString();
  redirect(qs ? `/media/movies?${qs}` : "/media/movies");
}
