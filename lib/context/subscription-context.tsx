"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionService } from "@/services/api/subscriptionService";
import { notificationService } from "@/services/api/notificationService";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { pickSection } from "@/lib/i18n/sections/define";
import { walletText } from "@/lib/i18n/sections/wallet";
import { ApiError } from "@/services/api/apiClient";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import type { AppUser } from "@/types/user";

interface SubscriptionContextValue {
  isSubscribed: boolean;
  expiresAt: string | null;
  planName: string | null;
  durationDays: number | null;
  isLoading: boolean;
  subscribe: (planId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY_STATUS: SubscriptionStatus = {
  isActive: false,
  expiresAt: null,
  planId: null,
  planName: null,
  durationDays: null,
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  // What GET /subscriptions/me last said, and for which profile it was asked.
  // Only refresh() fills it; a newer profile (refreshProfile, a new sign-in)
  // takes over again, because it carries the same live answer.
  const [fetched, setFetched] = useState<{ forUser: AppUser; status: SubscriptionStatus } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The status the profile (GET /users/me, already loaded by the auth
  // context) carries: the backend computes isSubscribed/expiresAt there with
  // the same rule as /subscriptions/me (an unexpired subscription row), so no
  // second request is needed on every page load. Signed out = not subscribed.
  const status: SubscriptionStatus = useMemo(() => {
    if (!isAuthenticated || !user) return EMPTY_STATUS;
    if (fetched && fetched.forUser === user) return fetched.status;
    return {
      ...EMPTY_STATUS,
      isActive: user.isSubscribed,
      expiresAt: user.subscriptionExpiresAt,
    };
  }, [isAuthenticated, user, fetched]);

  /** Asks /subscriptions/me again (after a purchase, or when a caller wants it). */
  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFetched(null);
      return;
    }
    setIsLoading(true);
    try {
      const result = await subscriptionService.getMyStatus();
      setFetched({ forUser: user, status: result });
    } catch {
      setFetched({ forUser: user, status: EMPTY_STATUS });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const subscribe = useCallback(
    async (planId: string) => {
      try {
        // The Subscribe dialog has already loaded the plans; read them from
        // its cache, and only ask the server when they are not there.
        const plans =
          queryClient.getQueryData<SubscriptionPlan[]>(["subscription-plans"]) ??
          (await subscriptionService.getPlans());
        const plan = plans.find((p: SubscriptionPlan) => p.id === planId);
        await subscriptionService.subscribe(planId);
        await loadStatus();
        // The subscribe endpoint debits the wallet but doesn't emit a
        // wallet.balanceUpdated socket event (unlike deposit approval) —
        // invalidate the query directly so the navbar pill and any open
        // wallet-balance UI reflect the debit immediately.
        queryClient.invalidateQueries({ queryKey: ["wallet-summary"] });
        // A completed subscription purchase is the one moment the level's
        // qualifying total (lifetime subscription spend) moves — deposits no
        const w = pickSection(walletText, language);
        toast.success(w.subscribedTitle, {
          description: plan ? w.subscribedToPlan(plan.name) : w.premiumActive,
        });
        notificationService.push({
          type: "SUBSCRIPTION",
          title: w.subscribedTitle,
          message: plan ? w.subscribedToPlan(plan.name) : w.premiumActive,
        });
        await refreshProfile();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : pickSection(walletText, language).subscriptionFailed);
        throw err;
      }
    },
    [language, loadStatus, refreshProfile, queryClient],
  );

  const value = useMemo(
    () => ({
      isSubscribed: status.isActive,
      expiresAt: status.expiresAt,
      planName: status.planName,
      durationDays: status.durationDays,
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
