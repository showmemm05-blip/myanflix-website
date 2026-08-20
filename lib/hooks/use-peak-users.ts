"use client";

import { useQuery } from "@tanstack/react-query";

import { peakUsersService } from "@/services/api";

/**
 * The site-wide "peak concurrent viewers" figure, shared by every surface that
 * shows it (home chip, rail tile, footer line) through ONE query key so the
 * number is fetched once and always agrees with itself across the chrome.
 *
 * Returns null while loading, on failure, or when the number wouldn't impress
 * anyone (0 / non-finite) — callers render nothing in that case. A "Peak of 0"
 * or a NaN is worse than no stat at all.
 */
export function usePeakUsers(): number | null {
  const { data } = useQuery({
    queryKey: ["peak-users"],
    queryFn: () => peakUsersService.getPeakUsers(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const peak = data?.peakUsers;
  if (typeof peak !== "number" || !Number.isFinite(peak) || peak <= 0) return null;
  return peak;
}

/** 1,234 -> "1.2K" — for the 56px rail column where a full figure cannot fit. */
export function compactCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
