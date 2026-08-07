"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionService } from "@/services/api/subscriptionService";
import { notificationService } from "@/services/api/notificationService";
import { useAuth } from "@/lib/context/auth-context";
import { ApiError } from "@/services/api/apiClient";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";

interface SubscriptionContextValue {
  isSubscribed: boolean;
  expiresAt: string | null;
  planName: string | null;
  isLoading: boolean;
  subscribe: (planId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY_STATUS: SubscriptionStatus = { isActive: false, expiresAt: null, planName: null };

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SubscriptionStatus>(EMPTY_STATUS);
  const [isLoading, setIsLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(EMPTY_STATUS);
      return;
    }
    setIsLoading(true);
    try {
      const result = await subscriptionService.getMyStatus();
      setStatus(result);
    } catch {
      setStatus(EMPTY_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const subscribe = useCallback(
    async (planId: string) => {
      try {
        const plans = await subscriptionService.getPlans();
        const plan = plans.find((p: SubscriptionPlan) => p.id === planId);
        await subscriptionService.subscribe(planId);
        await loadStatus();
        // The subscribe endpoint debits the wallet but doesn't emit a
        // wallet.balanceUpdated socket event (unlike deposit approval) —
        // invalidate the query directly so the navbar pill and any open
        // wallet-balance UI reflect the debit immediately.
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
        toast.success("Subscribed", {
          description: plan
            ? `You're now subscribed to ${plan.name}. Enjoy all subscription content!`
            : "Your subscription is now active.",
        });
        notificationService.push({
          type: "SUBSCRIPTION",
          title: "Subscription active",
          message: plan
            ? `You've subscribed to ${plan.name}. Enjoy all subscription content!`
            : "Your subscription is now active.",
        });
        await refreshProfile();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Subscription failed");
        throw err;
      }
    },
    [loadStatus, refreshProfile, queryClient],
  );

  const value = useMemo(
    () => ({
      isSubscribed: status.isActive,
      expiresAt: status.expiresAt,
      planName: status.planName,
      isLoading,
      subscribe,
      refresh: loadStatus,
    }),
    [status, isLoading, subscribe, loadStatus],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
