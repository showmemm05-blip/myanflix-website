import { apiClient } from "./apiClient";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { Category } from "@/types/category";
import type { Movie, MovieQuery } from "@/types/movie";
import type { PurchaseEntry } from "@/types/purchase";

interface BackendMovie {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  language: string;
  releaseYear: number;
  duration: number;
  rating: number;
  price: number;
  isPremium: boolean;
  status: Movie["status"];
  categories: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

function mapMovie(m: BackendMovie): Movie {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    posterUrl: m.posterUrl,
    coverUrl: m.coverUrl,
    genre: m.genre,
    categories: m.categories,
    language: m.language,
    releaseYear: m.releaseYear,
    duration: m.duration,
    rating: m.rating,
    price: m.price,
    isPremium: m.isPremium,
    status: m.status,
    isMyanmar: m.language === "Burmese",
    isPurchased: false,
    isInWatchlist: false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

interface BackendPurchaseEntry {
  id: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string | null;
  amount: number;
  createdAt: string;
}

function mapPurchase(entry: BackendPurchaseEntry): PurchaseEntry {
  return {
    id: entry.id,
    movieId: entry.movieId,
    movieTitle: entry.movieTitle,
    posterUrl: entry.posterUrl,
    amount: entry.amount,
    purchasedAt: entry.createdAt,
  };
}

// The backend orders by createdAt desc by default; everything else is sorted client-side
// over the fetched page since GET /movies doesn't accept a `sort` query param yet.
function applyClientSort(movies: Movie[], sort?: MovieQuery["sort"]): Movie[] {
  const sorted = [...movies];
  switch (sort) {
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    default:
      return sorted;
  }
}

// language/minRating/maxPrice have no backend query support yet — filtered locally over the fetched page.
function applyClientFilters(movies: Movie[], query: MovieQuery): Movie[] {
  return movies.filter((m) => {
    if (query.language && m.language !== query.language) return false;
    if (query.minRating !== undefined && m.rating < query.minRating) return false;
    if (query.maxPrice !== undefined && m.price > query.maxPrice) return false;
    return true;
  });
}

export const movieService = {
  async getMovies(query: MovieQuery = {}): Promise<PaginatedResponse<Movie>> {
    const { sort, language, minRating, maxPrice, ...backendParams } = query;
    const res = await apiClient.get<{ items: BackendMovie[]; total: number; page: number; limit: number }>(
      "/movies",
      { params: backendParams },
    );
    const filtered = applyClientFilters(res.items.map(mapMovie), { language, minRating, maxPrice });
    return { ...res, items: applyClientSort(filtered, sort), total: filtered.length };
  },

  async getMovieById(id: string): Promise<Movie | null> {
    try {
      const movie = await apiClient.get<BackendMovie>(`/movies/${id}`);
      return mapMovie(movie);
    } catch {
      return null;
    }
  },

  async getSimilarMovies(movieId: string, limit = 8): Promise<Movie[]> {
    const movie = await movieService.getMovieById(movieId);
    if (!movie) return [];
    const res = await movieService.getMovies({ genre: movie.genre, limit: limit + 1 });
    return res.items.filter((m) => m.id !== movieId).slice(0, limit);
  },

  async getNewReleases(limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ limit });
    return res.items;
  },

  async getMostPurchased(limit = 12): Promise<Movie[]> {
    const movies = await apiClient.get<BackendMovie[]>("/movies/most-purchased");
    return movies.slice(0, limit).map(mapMovie);
  },

  async getTopRated(limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ sort: "rating", limit: 40 });
    return res.items.slice(0, limit);
  },

  async getRecommended(genres: string[], limit = 12): Promise<Movie[]> {
    if (genres.length === 0) return [];
    const res = await movieService.getMovies({ genre: genres[0], limit });
    return res.items;
  },

  async getMyanmarMovies(limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ limit: 40 });
    return res.items.filter((m) => m.isMyanmar).slice(0, limit);
  },

  async getInternationalMovies(limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ limit: 40 });
    return res.items.filter((m) => !m.isMyanmar).slice(0, limit);
  },

  async getByGenre(genre: string, limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ genre, limit });
    return res.items;
  },

  getCategories() {
    return apiClient.get<Category[]>("/categories");
  },

  async getCategoryById(id: string): Promise<Category | null> {
    try {
      return await apiClient.get<Category>(`/categories/${id}`);
    } catch {
      return null;
    }
  },

  purchaseMovie(movieId: string) {
    return apiClient.post<{ id: string }>(`/movies/${movieId}/purchase`);
  },

  async getMyPurchases(pagination: PaginationParams = {}): Promise<PaginatedResponse<PurchaseEntry>> {
    const res = await apiClient.get<PaginatedResponse<BackendPurchaseEntry>>("/movies/me/purchases", {
      params: pagination,
    });
    return { ...res, items: res.items.map(mapPurchase) };
  },
};
