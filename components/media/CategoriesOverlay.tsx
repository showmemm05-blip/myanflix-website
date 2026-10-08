"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { AlertCircleIcon, CloseIcon } from "@/components/system";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMovieFacets } from "@/hooks/use-movies";
import { useSeriesFacets } from "@/hooks/use-series";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { cn } from "@/lib/utils";
import {
  booksCategoryHref,
  categoryKindFromParam,
  genreViewHref,
  hubHref,
  useBookCategories,
  useCatalogCategories,
  type CategoryKind,
} from "./media-data";

/** What the overlay marks as "showing now": the whole kind, a genre or a category. */
export type CategoryPick = "all" | `genre:${string}` | `category:${string}`;

/**
 * THE CATEGORIES OVERLAY (MediaCategories.dc.html) — the app's full-screen
 * list, over a page dimmed to 88% black with a light blur.
 *
 * A Movies · Series · Books switch under the title (the owner's 2026-10-07
 * ask: pick the type inside the pop-up, not before opening it). It opens on
 * the type of the page underneath and switching swaps the list in place.
 *
 * - Movies / Series: "All movies" (or "All series"), the Genres (from the
 *   catalogue facets) and every admin Category in name order — empty ones
 *   included, with no "empty" tag. GET /categories needs a session, so a
 *   guest sees the genres.
 * - Books: "All books" and every book category (GET /book-categories, the
 *   books' own shelves). Books are members only, so a guest gets a short
 *   sign-in prompt instead and the list is never asked for.
 *
 * Names are big and grey; the one showing now is white and heavy and is
 * scrolled into view. A round white close button sits at the bottom centre.
 * Focus is trapped, Esc closes, focus goes back (base-ui).
 */
export function CategoriesOverlay({
  open,
  onClose,
  onNavigate,
  onPick,
  initialKind = "movies",
  current = "all",
  currentKind,
}: {
  open: boolean;
  /**
   * Esc or the round close disc. The overlay is the board's full-screen list
   * (the dimmed page shows through but sits under the overlay itself), so
   * there is no outside area to click — as in the app.
   */
  onClose: () => void;
  /** A name was picked (the link navigates on its own). */
  onNavigate?: () => void;
  /**
   * Which name was picked, and from which list. For a page that keeps the
   * pick in its own state as well as in the address (the Books hub), so a
   * pick that leaves the address unchanged still takes effect.
   */
  onPick?: (kind: CategoryKind, pick: CategoryPick) => void;
  /** The list the overlay opens on. */
  initialKind?: CategoryKind;
  /** What the page underneath is showing… */
  current?: CategoryPick;
  /** …and which list it belongs to (defaults to `initialKind`). */
  currentKind?: CategoryKind;
}) {
  const m = useSection(mediaText);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-black/88 outline-none backdrop-blur-[10px]">
          {/* The body only mounts while open, so its lists are asked for then
              and the switch starts again on the page's type every opening. */}
          <OverlayBody
            onNavigate={onNavigate}
            onPick={onPick}
            initialKind={initialKind}
            current={current}
            currentKind={currentKind ?? initialKind}
          />
          <DialogPrimitive.Close
            aria-label={m.closeCategories}
            className="fixed bottom-8 left-1/2 z-[91] flex size-14 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-play text-ink transition-opacity duration-150 outline-none hover:opacity-[.88] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:scale-[0.97]"
          >
            <CloseIcon size={24} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const NAME_GRID =
  "grid w-full max-w-[1120px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-2 gap-y-1";
const GROUP_HEADING =
  "mt-7 mb-2 text-[13px] leading-[18px] font-extrabold tracking-[0.1em] text-fg-faint uppercase [&:lang(my)]:tracking-normal";

function nameClass(on: boolean) {
  return cn(
    "flex min-h-[52px] items-center justify-center rounded-[12px] px-3.5 py-1.5 text-center transition-colors duration-150 outline-none hover:bg-white/6 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
    on
      ? "text-2xl leading-8 font-black tracking-[-0.02em] text-fg [&:lang(my)]:tracking-normal"
      : "text-[22px] leading-[30px] font-semibold tracking-[-0.01em] text-fg-muted [&:lang(my)]:tracking-normal",
  );
}

function OverlayBody({
  onNavigate,
  onPick,
  initialKind,
  current,
  currentKind,
}: {
  onNavigate?: () => void;
  onPick?: (kind: CategoryKind, pick: CategoryPick) => void;
  initialKind: CategoryKind;
  current: CategoryPick;
  currentKind: CategoryKind;
}) {
  const m = useSection(mediaText);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<CategoryKind>(initialKind);
  // What the screen reader hears after a switch (empty on opening, so the
  // dialog's own title is not read twice).
  const [announcement, setAnnouncement] = useState("");

  // Only the list on show asks for its genres and categories (Books has its own).
  const movieFacets = useMovieFacets({ enabled: kind === "movies" });
  const seriesFacets = useSeriesFacets({ enabled: kind === "series" });
  const facets = kind === "series" ? seriesFacets : movieFacets;
  const categories = useCatalogCategories(isAuthenticated && kind !== "books");
  // Members only: a guest (or a viewer whose session is still being checked)
  // never asks, and nobody asks before the Books list is actually shown.
  const bookCategories = useBookCategories(isAuthenticated && kind === "books");

  const titleOf = (k: CategoryKind) =>
    k === "books" ? m.bookCategories : k === "series" ? m.seriesCategories : m.movieCategories;

  const ready =
    kind === "books"
      ? !isAuthLoading && !(isAuthenticated && bookCategories.isLoading)
      : !(facets.isLoading || (isAuthenticated && categories.isLoading));

  // A switch starts the new list at the top…
  useEffect(() => {
    const scroller = rootRef.current?.parentElement;
    if (scroller) scroller.scrollTop = 0;
  }, [kind]);
  // …and the name showing now (when it is in this list) is brought into view
  // once the list is there.
  useEffect(() => {
    if (!ready) return;
    rootRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "center" });
  }, [kind, ready]);

  const choose = (next: CategoryKind) => {
    if (next === kind) return;
    setKind(next);
    setAnnouncement(titleOf(next));
  };

  // The current pick only lights up in the list of the kind it belongs to.
  const isCurrent = (key: CategoryPick) => kind === currentKind && key === current;
  // A name was tapped: tell the page what was picked, then let the link go.
  const pick = (key: CategoryPick) => {
    onPick?.(kind, key);
    onNavigate?.();
  };

  return (
    <div
      ref={rootRef}
      className="mq-rise flex min-h-full flex-col items-center px-gutter pt-[clamp(40px,5vw,72px)] pb-[168px]"
    >
      <DialogPrimitive.Title className="text-[13px] leading-[18px] font-extrabold tracking-[0.1em] text-fg-faint uppercase [&:lang(my)]:tracking-normal">
        {titleOf(kind)}
      </DialogPrimitive.Title>
      <KindSwitch
        label={m.showCategoriesFor}
        value={kind}
        onChange={choose}
        options={[
          { value: "movies", label: m.movies },
          { value: "series", label: m.series },
          { value: "books", label: m.books },
        ]}
      />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {kind === "books" ? (
        <BooksList
          isCurrent={isCurrent}
          onPick={pick}
          onNavigate={onNavigate}
          ready={ready}
          isAuthenticated={isAuthenticated}
          query={bookCategories}
        />
      ) : (
        <CatalogList
          kind={kind}
          isCurrent={isCurrent}
          onPick={pick}
          ready={ready}
          isAuthenticated={isAuthenticated}
          facets={facets}
          categories={categories}
        />
      )}
    </div>
  );
}

/**
 * The Movies · Series · Books switch — three real buttons (aria-pressed),
 * fully round, 44px tall. Selected = white with ground-coloured text; the
 * others sit on the soft tonal fill with muted text.
 */
function KindSwitch({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: CategoryKind;
  onChange: (value: CategoryKind) => void;
  options: ReadonlyArray<{ value: CategoryKind; label: string }>;
}) {
  return (
    <div role="group" aria-label={label} className="mt-3.5 flex flex-wrap justify-center gap-2">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 min-w-[88px] cursor-pointer items-center justify-center rounded-full border-0 px-5 text-[15px] leading-5 whitespace-nowrap transition-colors duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link motion-reduce:transition-none",
              on
                ? "bg-play font-extrabold text-ground"
                : "bg-tonal-soft font-bold text-fg-muted hover:bg-tonal-hover hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ListSkeleton() {
  const m = useSection(mediaText);
  return (
    <div
      aria-busy="true"
      className="mt-10 grid w-full max-w-[1120px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] justify-items-center gap-x-2 gap-y-[22px]"
    >
      {[140, 110, 160, 120, 100, 150, 130, 90, 170, 120, 140, 110, 150, 100, 130].map((w, i) => (
        <span key={i} className="mq-skeleton block h-6 rounded-[6px]" style={{ width: w }} />
      ))}
      <p role="status" className="sr-only">
        {m.loadingCategories}
      </p>
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  return (
    <div className="mt-[72px] flex flex-col items-center text-center" role="alert">
      <span className="flex size-16 items-center justify-center rounded-full bg-danger/14 text-danger">
        <AlertCircleIcon size={28} />
      </span>
      <p className="mt-[18px] text-[17px] leading-[26px] text-fg-muted">{m.loadCategoriesFailed}</p>
      <Button variant="tonal" size="cta" className="mt-[18px] px-7" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </div>
  );
}

function ListEmpty() {
  const m = useSection(mediaText);
  return <p className="mt-8 text-center text-[17px] leading-[26px] text-fg-faint">{m.noCategoriesYet}</p>;
}

/** One name in the list: a link that opens the pick and closes the overlay. */
function NameLink({
  href,
  on,
  onClick,
  className,
  children,
}: {
  href: string;
  on: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={onClick} aria-current={on ? "page" : undefined} className={cn(nameClass(on), className)}>
      {children}
    </Link>
  );
}

/** The Movies or Series list — exactly the rules the overlay had before the Books switch. */
function CatalogList({
  kind,
  isCurrent,
  onPick,
  ready,
  isAuthenticated,
  facets,
  categories,
}: {
  kind: "movies" | "series";
  isCurrent: (key: CategoryPick) => boolean;
  onPick: (key: CategoryPick) => void;
  ready: boolean;
  isAuthenticated: boolean;
  facets: ReturnType<typeof useMovieFacets> | ReturnType<typeof useSeriesFacets>;
  categories: ReturnType<typeof useCatalogCategories>;
}) {
  const m = useSection(mediaText);
  const genres = (facets.data?.genres ?? []).map((g) => g.value);
  const failed = facets.isError || (isAuthenticated && categories.isError);
  const sortedCategories = isAuthenticated
    ? [...(categories.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  if (!ready) return <ListSkeleton />;
  if (failed && genres.length === 0) {
    return (
      <ListError
        onRetry={() => {
          void facets.refetch();
          if (isAuthenticated) void categories.refetch();
        }}
      />
    );
  }
  return (
    <>
      <NameLink href={hubHref(kind)} on={isCurrent("all")} onClick={() => onPick("all")} className="mt-7">
        {kind === "movies" ? m.allMovies : m.allSeries}
      </NameLink>

      {genres.length === 0 && sortedCategories.length === 0 && <ListEmpty />}

      {genres.length > 0 && (
        <>
          <h3 className={GROUP_HEADING}>{m.genres}</h3>
          <ul className={NAME_GRID}>
            {genres.map((genre) => (
              <li key={genre}>
                <NameLink
                  href={genreViewHref(kind, { genre })}
                  on={isCurrent(`genre:${genre}`)}
                  onClick={() => onPick(`genre:${genre}`)}
                >
                  {genre}
                </NameLink>
              </li>
            ))}
          </ul>
        </>
      )}

      {sortedCategories.length > 0 && (
        <>
          <h3 className={GROUP_HEADING}>{m.categories}</h3>
          <ul className={NAME_GRID}>
            {sortedCategories.map((category) => (
              <li key={category.id}>
                <NameLink
                  href={genreViewHref(kind, { categoryId: category.id, name: category.name })}
                  on={isCurrent(`category:${category.id}`)}
                  onClick={() => onPick(`category:${category.id}`)}
                >
                  {category.name}
                </NameLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** The Books list — the books' own categories, or a sign-in prompt for a guest. */
function BooksList({
  isCurrent,
  onPick,
  onNavigate,
  ready,
  isAuthenticated,
  query,
}: {
  isCurrent: (key: CategoryPick) => boolean;
  onPick: (key: CategoryPick) => void;
  onNavigate?: () => void;
  ready: boolean;
  isAuthenticated: boolean;
  query: ReturnType<typeof useBookCategories>;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const pathname = usePathname();
  const params = useSearchParams();

  if (!ready) return <ListSkeleton />;

  if (!isAuthenticated) {
    // After signing in, come back to this page with the Books list open.
    const back = new URLSearchParams(params.toString());
    back.set("categories", "books");
    return (
      <div className="mt-[72px] flex flex-col items-center text-center">
        <p className="max-w-[420px] text-[17px] leading-[26px] text-fg-muted">{m.signInForBookCategories}</p>
        <Link
          href={loginHref(`${pathname}?${back.toString()}`)}
          onClick={onNavigate}
          className={buttonVariants({ variant: "play", size: "cta", className: "mt-[18px] px-7" })}
        >
          {t.browse.signIn}
        </Link>
      </div>
    );
  }

  if (query.isError && !query.data) return <ListError onRetry={() => void query.refetch()} />;

  const sorted = [...(query.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <NameLink href="/media/books" on={isCurrent("all")} onClick={() => onPick("all")} className="mt-7">
        {m.allBooks}
      </NameLink>

      {sorted.length === 0 ? (
        <ListEmpty />
      ) : (
        <>
          <h3 className={GROUP_HEADING}>{m.categories}</h3>
          <ul className={NAME_GRID}>
            {sorted.map((category) => (
              <li key={category.id}>
                <NameLink
                  href={booksCategoryHref(category.id)}
                  on={isCurrent(`category:${category.id}`)}
                  onClick={() => onPick(`category:${category.id}`)}
                >
                  {category.name}
                </NameLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/**
 * A page's overlay, opened by the address: the Media chip strip adds
 * `?categories=movies|series|books` to the page it is on (the older
 * `?categories=1` still works and means the page's own type). Closing
 * removes the parameter again, so Back closes it too and a shared link
 * opens on the same list.
 *
 * The hub's catalog rewrites its own address on first load (it spells its
 * tab and filters into the URL). That rewrite keeps `categories`, but the
 * overlay also remembers that it was opened by the address it loaded with,
 * so it stays open on its own until it is closed even if the parameter goes.
 */
export function CategoriesOverlayFromUrl({
  pageKind = "movies",
  current = "all",
  onPick,
}: {
  /** The type of the page underneath — what `?categories=1` opens on. */
  pageKind?: CategoryKind;
  /** What the page underneath is showing, highlighted in its list. */
  current?: CategoryPick;
  /** A name was picked (see CategoriesOverlay). */
  onPick?: (kind: CategoryKind, pick: CategoryPick) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const param = params.get("categories");
  const [openedOnLoad, setOpenedOnLoad] = useState(() => param !== null);
  const [kindOnOpen] = useState<CategoryKind>(() => categoryKindFromParam(param, pageKind));
  const open = param !== null || openedOnLoad;

  const close = () => {
    setOpenedOnLoad(false);
    if (param === null) return;
    const next = new URLSearchParams(params.toString());
    next.delete("categories");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <CategoriesOverlay
      open={open}
      onClose={close}
      onNavigate={() => setOpenedOnLoad(false)}
      onPick={onPick}
      initialKind={param === null ? kindOnOpen : categoryKindFromParam(param, pageKind)}
      current={current}
      currentKind={pageKind}
    />
  );
}
