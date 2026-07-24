"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggestions } from "@/hooks/use-movies";
import { useLanguage } from "@/lib/context/language-context";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [term, setTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debouncedTerm = useDebounce(term, 250);
  const { data: suggestions = [] } = useSearchSuggestions(debouncedTerm);
  const containerRef = useRef<HTMLDivElement>(null);

  const showSuggestions = isFocused && term.trim().length > 0;

  const goToSearch = () => {
    if (!term.trim()) return;
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={(e) => e.key === "Enter" && goToSearch()}
          placeholder={t.nav.searchPlaceholder}
          className="bg-secondary/60 pl-9 pr-9"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="glass-card absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border-white/[0.08] py-1.5">
          {suggestions.map((movie) => (
            <Link
              key={movie.id}
              href={`/movie/${movie.id}`}
              onClick={() => setIsFocused(false)}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/60"
            >
              <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
                <Image src={movie.posterUrl ?? FALLBACK_POSTER_URL} alt={movie.title} fill sizes="32px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{movie.title}</p>
                <p className="text-xs text-muted-foreground">
                  {movie.releaseYear} &middot; {movie.genre}
                </p>
              </div>
            </Link>
          ))}
          <button
            type="button"
            onClick={goToSearch}
            className="w-full px-3 py-2 text-left text-xs font-medium text-primary hover:bg-secondary/60"
          >
            {t.search.seeAllResultsFor(term)}
          </button>
        </div>
      )}
    </div>
  );
}
