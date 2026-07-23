import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { User } from "./models/User";
import { Movie } from "./models/Movie";

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
      origin: true,
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

interface CinemaSession {
  movieId: string;
  movieTitle: string;
  movieType: string;
  watchLink?: string;
  status: "playing" | "paused";
  currentTime: number;
  participants: string[]; // array of userIds
  showStarted: boolean;
  readyUsers: string[]; // array of userIds
  updatedAt: number;
  activeServer?: string;
}

const activeCinemaSessions = new Map<string, CinemaSession>(); // key: relationshipId

const updateCinemaRoomParticipants = (relationshipId: string) => {
  if (!io) return;
  const session = activeCinemaSessions.get(relationshipId);
  if (!session) return;

  const roomName = `cinema:${relationshipId}`;
  const clients = io.sockets.adapter.rooms.get(roomName);
  const activeUserIds = new Set<string>();

  if (clients) {
    for (const clientId of clients) {
      const clientSocket = io.sockets.sockets.get(clientId);
      if (clientSocket && (clientSocket as any).userId) {
        activeUserIds.add((clientSocket as any).userId.toString());
      }
    }
  }

  session.participants = Array.from(activeUserIds);
  session.readyUsers = (session.readyUsers || []).filter((uid) => activeUserIds.has(uid.toString()));

  if (session.participants.length === 0) {
    activeCinemaSessions.delete(relationshipId);
  } else {
    io.to(roomName).emit("cinema_session_state", session);
  }
};

const getRelId = (rel: any): string => {
  if (!rel) return "";
  return typeof rel === "object"
    ? (rel._id?.toString() || rel.id?.toString() || "")
    : rel.toString();
};

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(userRoom(userId));

    socket.on("join_cinema", async (payload: { relationshipId: any }) => {
      try {
        const relationshipId = getRelId(payload.relationshipId);
        if (!relationshipId) return;

        (socket as any).relationshipId = relationshipId;
        await socket.join(`cinema:${relationshipId}`);

        let session = activeCinemaSessions.get(relationshipId);
        if (!session) {
          session = {
            movieId: "",
            movieTitle: "",
            movieType: "",
            watchLink: "",
            status: "paused",
            currentTime: 0,
            participants: [],
            showStarted: false,
            readyUsers: [],
            updatedAt: Date.now(),
          };
          activeCinemaSessions.set(relationshipId, session);
        }

        updateCinemaRoomParticipants(relationshipId);

        const user = await User.findById(userId);
        if (user && user.partnerId) {
          emitToUser(user.partnerId.toString(), "partner_joined_cinema", { userId });
        }
      } catch (err) {
        console.error("join_cinema error:", err);
      }
    });

    socket.on("start_cinema", async (payload: { relationshipId: any; movieId: string; movieTitle: string; movieType: string; watchLink?: string }) => {
      try {
        const relationshipId = getRelId(payload.relationshipId);
        const { movieId, movieTitle, movieType, watchLink } = payload;
        if (!relationshipId || !movieId) return;

        const session: CinemaSession = {
          movieId,
          movieTitle,
          movieType,
          watchLink,
          status: "paused",
          currentTime: 0,
          participants: [userId],
          showStarted: false,
          readyUsers: [],
          updatedAt: Date.now(),
        };

        activeCinemaSessions.set(relationshipId, session);
        io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);

        const user = await User.findById(userId);
        if (user && user.partnerId) {
          emitToUser(user.partnerId.toString(), "cinema_started_alert", {
            movieId,
            movieTitle,
          });
        }
      } catch (err) {
        console.error("start_cinema error:", err);
      }
    });

    socket.on("cinema_state_change", (payload: { relationshipId: any; status: "playing" | "paused"; currentTime: number }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { status, currentTime } = payload;
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        session.status = status;
        session.currentTime = currentTime;
        session.updatedAt = Date.now();
        
        socket.to(`cinema:${relationshipId}`).emit("cinema_state_changed", {
          status,
          currentTime,
          userId,
        });
      }
    });

    socket.on("cinema_countdown", (payload: { relationshipId: any }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      io?.to(`cinema:${relationshipId}`).emit("cinema_countdown", { relationshipId, userId });
      io?.to(`cinema:${relationshipId}`).emit("cinema_countdown_trigger", { userId });
    });

    socket.on("cinema_focus_change", (payload: { relationshipId: any; isFocused?: boolean; hasFocus?: boolean }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const isFocused = payload.isFocused !== undefined ? payload.isFocused : (payload.hasFocus ?? true);

      io?.to(`cinema:${relationshipId}`).emit("cinema_focus_change", {
        relationshipId,
        userId,
        isFocused,
      });
      socket.to(`cinema:${relationshipId}`).emit("partner_focus_changed", {
        userId,
        hasFocus: isFocused,
      });
    });

    socket.on("cinema_heartbeat_ping", (payload: { timestamp?: number }) => {
      const timestamp = payload?.timestamp ?? Date.now();
      socket.emit("cinema_heartbeat_pong", { timestamp, serverTime: Date.now() });
    });

    socket.on("cinema_chat", (payload: { relationshipId: any; text: string; senderName: string; type?: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { text, senderName } = payload;
      if (!relationshipId) return;

      socket.to(`cinema:${relationshipId}`).emit("cinema_chat_received", {
        text,
        senderName,
        userId,
        createdAt: new Date().toISOString(),
        type: payload.type || "text",
      });
    });

    socket.on("cinema_typing", (payload: { relationshipId: any; isTyping: boolean }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_typing_status", {
        isTyping: payload.isTyping,
        userId,
      });
    });

    socket.on("cinema_reaction", (payload: { relationshipId: any; emoji: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { emoji } = payload;
      if (!relationshipId) return;

      socket.to(`cinema:${relationshipId}`).emit("cinema_reaction_received", {
        emoji,
        userId,
      });
    });

    socket.on("cinema_start_show", (payload: { relationshipId: any }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        session.showStarted = true;
        io?.to(`cinema:${relationshipId}`).emit("cinema_show_started");
      }
    });

    socket.on("cinema_select_movie", (payload: { relationshipId: any; movieId: string; movieTitle: string; movieType: string; watchLink?: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        session.movieId = payload.movieId;
        session.movieTitle = payload.movieTitle;
        session.movieType = payload.movieType;
        session.watchLink = payload.watchLink;
        session.status = "paused";
        session.currentTime = 0;
        session.showStarted = false;
        session.readyUsers = [];
        session.updatedAt = Date.now();
        io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);
      }
    });

    // Source change mid-show — only updates watchLink, preserves show state
    socket.on("cinema_change_source", (payload: { relationshipId: any; watchLink: string; sourceKey: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        session.watchLink = payload.watchLink;
        session.updatedAt = Date.now();
        // Broadcast to ALL clients in the room (including sender) so everyone syncs
        io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);
        io?.to(`cinema:${relationshipId}`).emit("cinema_source_changed", { sourceKey: payload.sourceKey, watchLink: payload.watchLink });
      }
    });

    socket.on("cinema_change_server", (payload: { relationshipId: any; server: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        session.activeServer = payload.server;
        io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);
        io?.to(`cinema:${relationshipId}`).emit("cinema_server_changed", { server: payload.server });
      }
    });

    socket.on("cinema_ready_toggle", (payload: { relationshipId: any; ready: boolean }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      const session = activeCinemaSessions.get(relationshipId);
      if (session) {
        if (!session.readyUsers) {
          session.readyUsers = [];
        }
        if (payload.ready) {
          if (!session.readyUsers.includes(userId)) {
            session.readyUsers.push(userId);
          }
        } else {
          session.readyUsers = session.readyUsers.filter((id) => id !== userId);
        }

        // 2/2 watch check: start show if both are ready
        if (session.readyUsers.length >= 2) {
          session.showStarted = true;
          io?.to(`cinema:${relationshipId}`).emit("cinema_show_started");
        }
        io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);
      }
    });

    socket.on("cinema_dim_lights", (payload: { relationshipId: any; dimmed: boolean }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { dimmed } = payload;
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_dim_lights_changed", { dimmed, userId });
    });

    socket.on("cinema_throw_popcorn", (payload: { relationshipId: any }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_popcorn_thrown", { userId });
    });

    socket.on("cinema_send_cuddle", (payload: { relationshipId: any; senderName: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { senderName } = payload;
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_cuddle_received", { senderName, userId });
    });

    socket.on("cinema_sync_snacks", (payload: { relationshipId: any; snacks: Record<string, boolean> }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { snacks } = payload;
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_snacks_synced", { snacks, userId });
    });

    socket.on("cinema_sync_language", (payload: { relationshipId: any; subtitleLang: string; audioLang: string }) => {
      const relationshipId = getRelId(payload.relationshipId);
      const { subtitleLang, audioLang } = payload;
      if (!relationshipId) return;
      socket.to(`cinema:${relationshipId}`).emit("cinema_language_synced", { subtitleLang, audioLang, userId });
    });

    socket.on("extension_url_change", async (payload: { url: string }) => {
      try {
        const user = await User.findById(userId);
        if (user && user.partnerId) {
          emitToUser(user.partnerId.toString(), "extension_url_changed", { url: payload.url });
        }
      } catch (err) {
        console.error("extension_url_change error:", err);
      }
    });

    socket.on("extension_video_control", async (payload: { action: string; time: number; language?: string }) => {
      try {
        console.log("Server: Received extension_video_control:", payload, "from userId:", userId);
        const user = await User.findById(userId);
        if (user && user.partnerId) {
          console.log("Server: Relaying extension_video_controlled to partnerId:", user.partnerId.toString());
          emitToUser(user.partnerId.toString(), "extension_video_controlled", {
            action: payload.action,
            time: payload.time,
            language: payload.language,
          });
        }
      } catch (err) {
        console.error("extension_video_control error:", err);
      }
    });

    socket.on("cinema_resolve_link_response", async (payload: { movieId: string; watchLink: string }) => {
      try {
        console.log("Server: Received resolved watchLink from extension:", payload);
        const movie = await Movie.findById(payload.movieId);
        if (movie) {
          movie.watchLink = payload.watchLink;
          await movie.save();
          console.log(`Server: Saved watchLink for movie "${movie.title}": ${payload.watchLink}`);
          
          const user = await User.findById(userId);
          if (user) {
            const relationshipId = getRelId(user.relationshipId);
            let session = activeCinemaSessions.get(relationshipId);
            if (session && session.movieId === payload.movieId) {
              session.watchLink = payload.watchLink;
              io?.to(`cinema:${relationshipId}`).emit("cinema_session_state", session);
            }
          }
          
          // Also emit general movie_updated to reload watchlist
          emitToUser(movie.userId.toString(), "movie_updated", movie);
          const u = await User.findById(movie.userId);
          if (u && u.partnerId) {
            emitToUser(u.partnerId.toString(), "movie_updated", movie);
          }
        }
      } catch (err) {
        console.error("cinema_resolve_link_response error:", err);
      }
    });

    socket.on("leave_cinema", async (payload: { relationshipId: any }) => {
      const relationshipId = getRelId(payload.relationshipId);
      if (!relationshipId) return;

      await socket.leave(`cinema:${relationshipId}`);
      updateCinemaRoomParticipants(relationshipId);
      socket.to(`cinema:${relationshipId}`).emit("partner_left_cinema", { userId });
    });

    socket.on("disconnect", () => {
      const relId = (socket as any).relationshipId as string;
      if (relId) {
        updateCinemaRoomParticipants(relId);
        socket.to(`cinema:${relId}`).emit("partner_left_cinema", { userId });
      }
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
