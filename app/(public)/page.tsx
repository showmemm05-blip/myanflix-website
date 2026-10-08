import { HomePage } from "@/components/home/HomePage";

/**
 * / — HOME: movies, series and books (owner, 2026-10-08). The page itself is
 * the client component in components/home/HomePage.tsx: a rotating hero of
 * the newest titles under the see-through top bar, then the rows (Continue
 * watching, Recently added, New series, New on the shelf, Top 10 most
 * viewed, Top rated, Because you watched). Public: guests see the hero and
 * the public rows; members see the extra rows. The games storefront that
 * used to be Home is kept in components/home/arcade for the future games
 * rows.
 */
export default function Home() {
  return <HomePage />;
}
