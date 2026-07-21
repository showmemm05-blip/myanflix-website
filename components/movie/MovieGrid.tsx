import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import type { Movie } from "@/types/movie";

export function MovieGrid({ movies, isLoading }: { movies: Movie[]; isLoading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {isLoading
        ? Array.from({ length: 12 }).map((_, i) => <MovieCardSkeleton key={i} className="w-full" />)
        : movies.map((movie) => <MovieCard key={movie.id} movie={movie} className="w-full" />)}
    </div>
  );
}
