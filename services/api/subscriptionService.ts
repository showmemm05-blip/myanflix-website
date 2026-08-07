import { apiClient } from "./apiClient";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";

export const subscriptionService = {
  getPlans() {
    return apiClient.get<SubscriptionPlan[]>("/subscription-plans");
  },

  getMyStatus() {
    return apiClient.get<SubscriptionStatus>("/subscriptions/me");
  },

  subscribe(planId: string) {
    return apiClient.post<{ id: string; expiresAt: string }>("/subscriptions/subscribe", { planId });
  },
};
