"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "myanflix-wallet-balance-hidden";

/**
 * Whether the wallet balance is masked, shared by every surface that shows it.
 *
 * The balance now appears in two places at once (the rail tile on desktop, the
 * pill beside the avatar on a phone), and "hide my balance" has to mean hide it
 * *everywhere* — a per-component useState would leave one of them still
 * printing the number. A module-level store with useSyncExternalStore keeps
 * them in lockstep without a provider, and getServerSnapshot returns the
 * unmasked default so the server and first client render agree.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/** Never masked during SSR — the preference only exists in the browser. */
function getServerSnapshot() {
  return false;
}

export function useBalanceHidden(): [boolean, () => void] {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, String(!hidden));
    for (const listener of listeners) listener();
  };

  return [hidden, toggle];
}
