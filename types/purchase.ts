export interface PurchaseEntry {
  id: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string | null;
  amount: number;
  purchasedAt: string;
}
