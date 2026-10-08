"use client";

import { useRealtimeWallet } from "@/hooks/use-realtime-wallet";
import { useAuth } from "@/lib/context/auth-context";

/**
 * Mounts the wallet/deposit/notification socket listeners while someone is
 * signed in. Rendered by both the (public) and (protected) layouts, so the
 * top bar's balance pill and bell update live on every page that has the
 * top bar — Home and Media included, not just the account pages. The two
 * layouts are sibling route groups, so only one of them is ever mounted and
 * the listeners are never attached twice.
 *
 * Nothing is attached for a guest, and the listeners re-attach (keyed by the
 * user id) the moment someone signs in on a public page — auth-context opens
 * the socket before it sets the user, so getSocket() is ready by then.
 */
export function RealtimeWalletListener() {
  const { user } = useAuth();
  if (!user) return null;
  return <SocketListeners key={user.id} />;
}

function SocketListeners() {
  useRealtimeWallet();
  return null;
}
