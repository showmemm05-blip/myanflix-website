import { movieService } from "./movieService";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { PurchaseEntry } from "@/types/purchase";

export const purchaseService = {
  getMyPurchases(pagination: PaginationParams = {}): Promise<PaginatedResponse<PurchaseEntry>> {
    return movieService.getMyPurchases(pagination);
  },

  purchaseMovie(movieId: string) {
    return movieService.purchaseMovie(movieId);
  },
};
