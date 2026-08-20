import { io, type Socket } from "socket.io-client";
import { API_ORIGIN, CLIENT_PLATFORM } from "@/services/api/apiClient";

/**
 * Singleton Socket.IO client shared across the app. Connected on
 * login/session-restore and disconnected on logout by auth-context.tsx —
 * components just call getSocket() and attach/detach their own listeners.
 */
let socket: Socket | null = null;
let socketToken: string | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected && socketToken === token) return socket;

  socket?.disconnect();
  socketToken = token;
  socket = io(API_ORIGIN, {
    // `platform` rides along in the handshake because a live socket is what
    // makes a user "online" in the admin's presence view — without it the
    // gateway can see that someone is connected but not from where, and one
    // person on the site and the app would collapse into one anonymous dot.
    auth: { token, platform: CLIENT_PLATFORM },
    transports: ["websocket"],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
