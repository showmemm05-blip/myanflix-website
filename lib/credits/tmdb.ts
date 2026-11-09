/**
 * THE TMDB CREDIT (owner, 2026-11-06; plan 7.2 in
 * docs/movie-details-tmdb-2026-11-06/PLAN.md).
 *
 * Staff fill movie and series details from TMDB (themoviedb.org) in the
 * admin. TMDB's terms of use ask every product that uses their data to show
 * their logo and the sentence below in an About or Credits place. The
 * sentence is theirs, word for word ("application" → "website"), so it is
 * shown in English whatever the site language is and is never translated.
 *
 * Viewers load nothing from TMDB's servers: every poster and photo is our
 * own stored copy, and the logo is a file of this site (tmdb-logo.ts). The
 * site's image policy does not list image.tmdb.org, on purpose.
 *
 * A plain constant, no imports: usable from server and client code alike.
 */
export const TMDB_CREDIT_SENTENCE =
  "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";
