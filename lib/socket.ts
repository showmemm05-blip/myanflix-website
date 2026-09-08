import { io, type Socket } from "socket.io-client";
import {
  API_ORIGIN,
  CLIENT_PLATFORM,
  refreshAccessToken,
} from "@/services/api/apiClient";

/**
 * Singleton Socket.IO client shared across the app. Connected on
 * login/session-restore and disconnected on logout by auth-context.tsx —
 * components just call getSocket() and attach/detach their own listeners.
 *
 * The instance is deliberately long-lived: hooks such as
 * use-realtime-wallet grab it once via getSocket() and attach listeners for
 * the life of the protected layout. Swapping in a new Socket whenever the
 * access token rotates would orphan those listeners, so a token change
 * re-handshakes the SAME instance (mutate `auth`, disconnect().connect()).
 */
let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * Recovery guard for a handshake the gateway rejected (typically "jwt
 * expired" after the 15-minute access-token lifetime). Set while a refresh +
 * single reconnect is in flight or has just been attempted; cleared only once
 * a connection has stayed up for a moment, so a rejected retry cannot spin
 * into a refresh/reconnect loop.
 */
let recovering = false;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

const RECOVERY_SETTLE_MS = 5_000;

function looksLikeAuthRejection(message: string): boolean {
  return /jwt|token|expired|unauthori[sz]ed/i.test(message);
}

async function recoverFromAuthRejection(instance: Socket): Promise<void> {
  if (recovering) return;
  recovering = true;

  const staleToken = socketToken;
  // Goes through apiClient's single-flight refresh, so a socket rejection and
  // a 401'd REST call racing each other still only hit /auth/refresh once.
  // On success it writes tokenStore, whose onTokensChanged subscriber
  // (auth-context) calls connectSocket(next) — the call below then just
  // confirms the connection rather than starting a second one.
  const nextToken = await refreshAccessToken();

  // Bail if the socket was torn down (logout) or replaced while we waited.
  if (socket !== instance) return;

  if (!nextToken) {
    // Refresh failed: the session is gone. The next REST call will land in
    // apiClient's 401 path, which clears the store and notifies the auth
    // context — nothing to reconnect with here.
    return;
  }

  if (nextToken === staleToken) {
    // Same token came back (already refreshed by someone else moments ago and
    // the gateway still refused it) — one plain retry, no further attempts.
    if (!instance.active) instance.connect();
    return;
  }

  connectSocket(nextToken);
}

function attachRecoveryHandlers(instance: Socket): void {
  instance.on("connect", () => {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      recovering = false;
    }, RECOVERY_SETTLE_MS);
  });

  // Handshake refused by middleware (never reaches handleConnection).
  instance.on("connect_error", (err: Error) => {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (!looksLikeAuthRejection(err.message ?? "")) return;
    void recoverFromAuthRejection(instance);
  });

  // What the MyanFlix gateway actually does today: handleConnection verifies
  // the JWT and, on failure, client.disconnect(true) — the client sees
  // "connect" immediately followed by disconnect("io server disconnect"),
  // and socket.io-client will NOT auto-reconnect after a server-side
  // disconnect. Treat it like an auth rejection: refresh once, reconnect once.
  instance.on("disconnect", (reason) => {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    if (reason !== "io server disconnect") return;
    void recoverFromAuthRejection(instance);
  });
}

export function connectSocket(token: string): Socket {
  if (socket) {
    if (socketToken === token) {
      // Same credentials: only nudge it if it's neither connected nor already
      // trying to (e.g. after a server-side disconnect).
      if (!socket.active) socket.connect();
      return socket;
    }

    // Token rotated (refresh after the 15-minute access-token lifetime, or a
    // fresh login on top of a restored session): re-handshake the same
    // instance so every listener attached via getSocket() survives.
    socketToken = token;
    socket.auth = { token, platform: CLIENT_PLATFORM };
    socket.disconnect().connect();
    return socket;
  }

  socketToken = token;
  socket = io(API_ORIGIN, {
    // `platform` rides along in the handshake because a live socket is what
    // makes a user "online" in the admin's presence view — without it the
    // gateway can see that someone is connected but not from where, and one
    // person on the site and the app would collapse into one anonymous dot.
    auth: { token, platform: CLIENT_PLATFORM },
    transports: ["websocket"],
  });
  attachRecoveryHandlers(socket);
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  recovering = false;
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
