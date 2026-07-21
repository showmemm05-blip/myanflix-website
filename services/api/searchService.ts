import { movieService } from "@/services/api/movieService";
import type { PaginatedResponse } from "@/types/api";
import type { Movie, MovieQuery } from "@/types/movie";

export const searchService = {
  search(query: MovieQuery): Promise<PaginatedResponse<Movie>> {
    return movieService.getMovies(query);
  },

  async getSuggestions(term: string, limit = 6): Promise<Movie[]> {
    if (!term.trim()) return [];
    const res = await movieService.getMovies({ search: term, limit });
    return res.items;
  },
};
