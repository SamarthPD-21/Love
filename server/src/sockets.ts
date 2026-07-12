import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

let io: SocketServer | null = null;

/**
 * The room name a user's connected sockets join, so we can push to them
 * from anywhere in the server (e.g. the notify service).
 */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Initialize the socket.io server and attach it to the given HTTP server.
 * Reuses the same JWT secret / verification logic as middleware/auth.ts.
 */
export function initSockets(server: HttpServer): SocketServer {
  const clientOrigin =
    process.env.CLIENT_ORIGIN ||
    process.env.CLIENT_URL ||
    "http://localhost:3000";

  io = new SocketServer(server, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Auth middleware — verify the JWT passed in the handshake.
  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers.authorization as string)?.replace(
          "Bearer ",
          ""
        );

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error("JWT secret not configured"));
      }

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(userRoom(userId));

    socket.on("disconnect", () => {
      // socket.io handles leaving rooms automatically.
    });
  });

  return io;
}

/**
 * Emit an event to a specific user (delivered to all of their connected
 * devices/tabs). Silently no-ops if the socket server isn't initialized
 * or the user isn't currently connected.
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  try {
    io.to(userRoom(userId)).emit(event, payload);
  } catch (err) {
    console.warn("emitToUser failed:", err);
  }
}

export function getIO(): SocketServer | null {
  return io;
}
