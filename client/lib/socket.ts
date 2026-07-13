import { io, Socket } from "socket.io-client";

/**
 * The socket.io URL is the API origin without the "/api" path.
 * Falls back to the explicit NEXT_PUBLIC_SOCKET_URL, else derives from
 * NEXT_PUBLIC_API_URL, else the browser origin (same-origin in prod).
 */
function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiBase.replace(/\/api\/?$/, "");
}

let socket: Socket | null = null;

/**
 * Get (or lazily create) the singleton socket. Authenticated with the JWT
 * from localStorage — the same token used by the REST client.
 * Safe to call on every render; it memoizes.
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const token = localStorage.getItem("home-token");
    if (!token) return null;

    const socketUrl = getSocketUrl();
    localStorage.setItem("home-socket-url", socketUrl);

    socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      autoConnect: true,
    });
  }

  return socket;
}

/**
 * Re-create the socket after a login/token change so the new JWT is used.
 */
export function reconnectSocket(): Socket | null {
  disconnectSocket();
  return getSocket();
}

/**
 * Tear down the socket (e.g. on logout).
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a single socket event with automatic cleanup on disconnect.
 * Returns an unsubscribe function.
 */
export function onNotification(
  handler: (notification: unknown) => void
): () => void {
  const s = getSocket();
  if (!s) return () => {};

  const listener = (payload: unknown) => handler(payload);
  s.on("notification", listener);

  // If we weren't connected yet, make sure we attempt to connect.
  if (!s.connected) s.connect();

  return () => {
    s.off("notification", listener);
  };
}
