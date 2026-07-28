"use client";

import { useRealtimeWallet } from "@/hooks/use-realtime-wallet";

/** Mounts the wallet/deposit/notification socket listeners for the lifetime of the protected layout. */
export function RealtimeWalletListener() {
  useRealtimeWallet();
  return null;
}
