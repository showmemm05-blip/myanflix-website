# The Arcade (games storefront) — kept for the future games rows

Kept for the future games rows (owner, 2026-10-08).

On 2026-10-08 the owner decided that Home is a page of movies, series and
books (see `components/home/` and `app/(public)/page.tsx`). The games
storefront that used to be the Home page was moved here so that it keeps
compiling and can come back later as extra rows on Home. The only edits made
in the move were the `@/components/home/…` import paths, which now point at
`@/components/home/arcade/…`. (The pre-move versions were never committed to
git, so that claim rests on the move itself rather than on a diff.) It is not
referenced from navigation or any route.

- `ArcadeHome.tsx` — the whole old Home page, composed as one component.
- `Store*.tsx`, `GameArt.tsx`, `HomeIcons.tsx`, `RevealSection.tsx` — its
  sections, art and icons.
- Its data stays where it was: `lib/home/store.ts` (curated selections),
  `lib/home/lanes.ts` (the category registry), `lib/home/type.ts` (its type
  scale) and `lib/media/games-data.ts` (the mock games with their SVG art).
  Its strings stay in `t.home.store.*` (translations.ts) and the Arcade block
  of `lib/i18n/sections/home.ts`.

Nothing here fetches the catalogue; it is all local mock data and inline SVG.
