"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Users,
  Film,
  Heart,
  Smile,
  Sparkles,
  Check,
  Loader2,
  Search,
  RefreshCw,
  Star,
  ExternalLink,
  MessageSquare,
  X,
  Volume2,
  VolumeX,
  ArrowLeft,
  Tv,
  Settings,
  Coffee,
  Info
} from "lucide-react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn, getRelationshipId } from "@/lib/utils";

interface CinemaSession {
  movieId: string;
  movieTitle: string;
  movieType: string;
  watchLink?: string;
  status: "playing" | "paused";
  currentTime: number;
  participants: string[];
  showStarted?: boolean;
  readyUsers?: string[];
  activeServer?: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isSelf: boolean;
  createdAt: string;
}

interface FloatingParticle {
  id: string;
  emoji: string;
  left: number;
  delay?: number;
}

export default function CinemaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { playSound } = useSoundEffects();

  // Core Cinema States
  const [session, setSession] = useState<CinemaSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [isPartnerPresent, setIsPartnerPresent] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [cuddleAlert, setCuddleAlert] = useState<{ visible: boolean; sender: string } | null>(null);
  const [snacks, setSnacks] = useState<Record<string, boolean>>({
    popcorn: false,
    pizza: false,
    soda: false,
    candy: false,
  });

  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // New UI specific states
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  // Extension polling check
  useEffect(() => {
    const checkExtension = () => {
      const active = document.body.hasAttribute("data-love-sync-extension-active");
      setIsExtensionActive((prev) => (prev !== active ? active : prev));
    };
    checkExtension();
    const interval = setInterval(checkExtension, 1000);
    return () => {
      clearInterval(interval);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Player Source switching states
  const [activeSource, setActiveSource] = useState<string>("default");
  const [resolvingSource, setResolvingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [cachedAlternativeLinks, setCachedAlternativeLinks] = useState<Record<string, Record<string, string>>>({});

  // Map of all IMDB-based embed sources (key → url builder fn)
  const altSourceBuilders: Record<string, (imdbId: string, mediaType: string) => string> = {
    vidsrc_to: (id, t) => `https://vidsrc.to/embed/${t}/${id}`,
    vidsrc_me: (id, t) => `https://vidsrc.me/embed/${t}/${id}`,
    vidsrc_xyz: (id, t) => `https://vidsrc.xyz/embed/${t}/${id}`,
    vidsrcme_ru: (id, t) => `https://vidsrcme.ru/embed/${t}/${id}`,
    two_embed: (id) => `https://2embed.cc/embed/${id}`,
    multiembed: (id, t) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=0`,
    embedsu: (id, t) => `https://embed.su/embed/${t}/${id}`,
    autoembed: (id, t) => `https://player.autoembed.cc/embed/${t}/${id}`,
    smashystream: (id, t) => `https://player.smashy.stream/${t}/${id}`,
  };

  useEffect(() => {
    if (session?.watchLink) {
      const knownSource = Object.entries(altSourceBuilders).find(([, builder]) => {
        // Quick heuristic: check if domain is in the link
        const testUrl = builder("tt0000000", "movie");
        const domain = new URL(testUrl).hostname;
        return session.watchLink?.includes(domain);
      });
      setActiveSource(knownSource ? knownSource[0] : "default");
    }
  }, [session?.watchLink]);

  const handleSourceChange = async (sourceKey: string) => {
    if (!session || !socket || !user) return;
    setActiveSource(sourceKey);

    if (sourceKey === "default") {
      try {
        setResolvingSource(true);
        const res = await api.get(`/movies/${session.movieId}`);
        if (res.data.success && res.data.data.watchLink) {
          socket.emit("cinema_select_movie", {
            relationshipId: getRelationshipId(user.relationshipId),
            movieId: session.movieId,
            movieTitle: session.movieTitle,
            movieType: session.movieType,
            watchLink: res.data.data.watchLink,
          });
        }
      } catch (e) {
        console.error("Failed to restore default source link:", e);
      } finally {
        setResolvingSource(false);
      }
      return;
    }

    let links = cachedAlternativeLinks[session.movieId];
    if (!links) {
      try {
        setResolvingSource(true);
        const escapedTitle = session.movieTitle.replace(/"/g, '\\"');
        const mediaType = session.movieType === "movie" ? "movie" : "tv";
        let imdbId: string | null = null;

        // --- Attempt 1: Wikidata SPARQL (exact match) ---
        const typeFilter =
          session.movieType === "movie"
            ? `VALUES ?class { wd:Q11424 wd:Q29168811 wd:Q24869 }`
            : `VALUES ?class { wd:Q5398426 wd:Q21191270 wd:Q63952888 }`;

        const exactQuery = `
          SELECT ?imdbID WHERE {
            ${typeFilter}
            ?item wdt:P31 ?class .
            ?item wdt:P345 ?imdbID .
            ?item rdfs:label ?label .
            FILTER(LCASE(STR(?label)) = LCASE("${escapedTitle}"))
          }
          LIMIT 3
        `;

        const endpoint = "https://query.wikidata.org/sparql";
        try {
          const res = await fetch(`${endpoint}?query=${encodeURIComponent(exactQuery)}`, {
            headers: { Accept: "application/sparql-results+json" },
          });
          if (res.ok) {
            const json = await res.json();
            const bindings = json.results?.bindings ?? [];
            if (bindings.length > 0 && bindings[0].imdbID) {
              imdbId = bindings[0].imdbID.value;
            }
          }
        } catch {
          console.warn("Wikidata exact query failed, trying fuzzy...");
        }

        // --- Attempt 2: Wikidata SPARQL (fuzzy CONTAINS match) ---
        if (!imdbId) {
          const fuzzyQuery = `
            SELECT ?imdbID WHERE {
              ${typeFilter}
              ?item wdt:P31 ?class .
              ?item wdt:P345 ?imdbID .
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${escapedTitle}")))
            }
            LIMIT 5
          `;
          try {
            const res = await fetch(`${endpoint}?query=${encodeURIComponent(fuzzyQuery)}`, {
              headers: { Accept: "application/sparql-results+json" },
            });
            if (res.ok) {
              const json = await res.json();
              const bindings = json.results?.bindings ?? [];
              if (bindings.length > 0 && bindings[0].imdbID) {
                imdbId = bindings[0].imdbID.value;
              }
            }
          } catch {
            console.warn("Wikidata fuzzy query also failed.");
          }
        }

        // --- Attempt 3: OMDB API free tier fallback (1000 req/day) ---
        if (!imdbId) {
          try {
            const omdbRes = await fetch(
              `https://www.omdbapi.com/?t=${encodeURIComponent(session.movieTitle)}&type=${session.movieType === "movie" ? "movie" : "series"}&apikey=4a3b711b`
            );
            if (omdbRes.ok) {
              const omdbJson = await omdbRes.json();
              if (omdbJson.imdbID) {
                imdbId = omdbJson.imdbID;
              }
            }
          } catch {
            console.warn("OMDB fallback also failed.");
          }
        }

        // Build all alternative links from our resolved IMDB ID
        if (imdbId) {
          const built: Record<string, string> = {};
          for (const [key, builder] of Object.entries(altSourceBuilders)) {
            built[key] = builder(imdbId, mediaType);
          }
          links = built;
          setCachedAlternativeLinks((prev) => ({
            ...prev,
            [session.movieId]: links!,
          }));
        }
      } catch (e) {
        console.error("Failed to resolve alternative links:", e);
      } finally {
        setResolvingSource(false);
      }
    }

    if (links && links[sourceKey]) {
      socket.emit("cinema_select_movie", {
        relationshipId: getRelationshipId(user.relationshipId),
        movieId: session.movieId,
        movieTitle: session.movieTitle,
        movieType: session.movieType,
        watchLink: links[sourceKey],
      });
    } else {
      setSourceError(`Couldn't find "${session.movieTitle}" on external databases. Try a different source.`);
      setTimeout(() => setSourceError(null), 5000);
      setActiveSource("default");
    }
  };

  // Lobby states
  const [movies, setMovies] = useState<any[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"watchlist" | "watched">("watchlist");

  const fetchLobbyMovies = async () => {
    try {
      setLoadingMovies(true);
      const res = await api.get("/movies");
      if (res.data.success) {
        setMovies(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch lobby movies:", err);
    } finally {
      setLoadingMovies(false);
    }
  };

  useEffect(() => {
    if (session && !session.movieId) {
      fetchLobbyMovies();
    }
  }, [session?.movieId]);

  // Socket Core Subscriptions
  useEffect(() => {
    if (!socket || !user || !user.relationshipId) return;

    const relId = getRelationshipId(user.relationshipId);

    const handleConnect = () => {
      console.log("Cinema Page: Socket connected, joining room:", relId);
      socket.emit("join_cinema", { relationshipId: relId });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on("connect", handleConnect);

    // Listen to session state
    socket.on("cinema_session_state", (activeSession: CinemaSession | null) => {
      console.log("Cinema session state updated:", activeSession);
      setSession(activeSession);
      if (activeSession) {
        const present = activeSession.participants.length > 1;
        setIsPartnerPresent(present);

        // Update active server attribute on body for content.js
        if (activeSession.activeServer) {
          document.body.setAttribute("data-love-sync-server", activeSession.activeServer);
        } else {
          document.body.removeAttribute("data-love-sync-server");
        }
      }
    });

    socket.on("cinema_server_changed", (data: { server: string }) => {
      document.body.setAttribute("data-love-sync-server", data.server);
    });

    // Listen to partner presence changes
    socket.on("partner_joined_cinema", () => {
      setIsPartnerPresent(true);
      playSound("chime");
    });

    socket.on("partner_left_cinema", () => {
      setIsPartnerPresent(false);
      playSound("whoosh");
    });

    // Listen to chat messages
    socket.on("cinema_chat_received", (msg: { text: string; senderName: string; createdAt: string }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: msg.senderName,
          text: msg.text,
          isSelf: false,
          createdAt: msg.createdAt,
        },
      ]);
      playSound("notification");

      // Increment unread count if chat drawer is closed
      if (!chatOpen) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    // Listen to emoji reactions
    socket.on("cinema_reaction_received", (data: { emoji: string }) => {
      triggerReaction(data.emoji, 1);
      playSound("pop");
    });

    // Listen to dim lights changes
    socket.on("cinema_dim_lights_changed", (data: { dimmed: boolean }) => {
      setDimmed(data.dimmed);
      playSound("tap");
    });

    // Listen to popcorn throwing
    socket.on("cinema_popcorn_thrown", () => {
      triggerPopcornFight();
      playSound("pop");
    });

    // Listen to cuddle alerts
    socket.on("cinema_cuddle_received", (data: { senderName: string }) => {
      setCuddleAlert({ visible: true, sender: data.senderName });
      triggerReaction("💖", 12);
      playSound("success");
      setTimeout(() => setCuddleAlert(null), 4000);
    });

    // Listen to shared snacks checklist
    socket.on("cinema_snacks_synced", (data: { snacks: Record<string, boolean> }) => {
      setSnacks(data.snacks);
      playSound("tap");
    });

    // Listen to show starting
    socket.on("cinema_show_started", () => {
      setSession((prev) => {
        if (!prev) return null;
        return { ...prev, showStarted: true };
      });
      playSound("success");
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("cinema_session_state");
      socket.off("cinema_server_changed");
      socket.off("partner_joined_cinema");
      socket.off("partner_left_cinema");
      socket.off("cinema_chat_received");
      socket.off("cinema_reaction_received");
      socket.off("cinema_dim_lights_changed");
      socket.off("cinema_popcorn_thrown");
      socket.off("cinema_cuddle_received");
      socket.off("cinema_snacks_synced");
      socket.off("cinema_show_started");
      socket.emit("leave_cinema", { relationshipId: relId });
    };
  }, [user?.relationshipId, chatOpen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-hide controls triggers
  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      if (!chatOpen && session?.showStarted) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  useEffect(() => {
    const handleMouseMove = () => {
      showControlsTemporarily();
    };
    window.addEventListener("mousemove", handleMouseMove);
    showControlsTemporarily();
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [chatOpen, session?.showStarted]);

  // Reaction Animation Generators
  const triggerReaction = (emoji: string, count = 1) => {
    const batch: FloatingParticle[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(),
      emoji,
      left: Math.random() * 70 + 15,
      delay: Math.random() * 0.4,
    }));
    setFloatingParticles((prev) => [...prev, ...batch]);
    const t = setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 3200);
    timeoutsRef.current.push(t);
  };

  const triggerPopcornFight = () => {
    const batch: FloatingParticle[] = Array.from({ length: 16 }).map(() => ({
      id: Math.random().toString(),
      emoji: "🍿",
      left: Math.random() * 80 + 10,
      delay: Math.random() * 0.5,
    }));
    setFloatingParticles((prev) => [...prev, ...batch]);
    const t = setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 3200);
    timeoutsRef.current.push(t);
  };

  // User Actions Handlers
  const handleSendReaction = (emoji: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    triggerReaction(emoji, 1);
    playSound("pop");
    socket.emit("cinema_reaction", { relationshipId: relId, emoji });
  };

  const handleThrowPopcorn = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    triggerPopcornFight();
    playSound("pop");
    socket.emit("cinema_throw_popcorn", { relationshipId: relId });
  };

  const handleSendCuddle = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    triggerReaction("💖", 10);
    playSound("success");
    socket.emit("cinema_send_cuddle", {
      relationshipId: relId,
      senderName: user.name.split(" ")[0],
    });
  };

  const handleToggleLights = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    const newDim = !dimmed;
    setDimmed(newDim);
    playSound("tap");
    socket.emit("cinema_dim_lights", { relationshipId: relId, dimmed: newDim });
  };

  const handleToggleReady = () => {
    if (!socket || !user || !user.relationshipId || !session) return;
    const relId = getRelationshipId(user.relationshipId);
    const isReady = session.readyUsers?.includes(user._id) || false;
    socket.emit("cinema_ready_toggle", { relationshipId: relId, ready: !isReady });
    playSound("tap");
  };

  const handleLoadMovie = (movie: any) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_select_movie", {
      relationshipId: relId,
      movieId: movie._id,
      movieTitle: movie.title,
      movieType: movie.type,
      watchLink: movie.watchLink,
    });
    playSound("chime");
  };

  const handleChangeMovie = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_select_movie", {
      relationshipId: relId,
      movieId: "",
      movieTitle: "",
      movieType: "",
      watchLink: "",
    });
    playSound("whoosh");
  };

  const handleToggleSnack = (key: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    const updated = { ...snacks, [key]: !snacks[key] };
    setSnacks(updated);
    playSound("tap");
    socket.emit("cinema_sync_snacks", { relationshipId: relId, snacks: updated });
  };

  const handleServerChange = (serverKey: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_change_server", { relationshipId: relId, server: serverKey });
    playSound("tap");
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderName: user.name.split(" ")[0],
      text: chatInput,
      isSelf: true,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socket.emit("cinema_chat", {
      relationshipId: relId,
      text: chatInput,
      senderName: user.name.split(" ")[0],
    });

    setChatInput("");
    playSound("tap");
  };

  const toggleChat = () => {
    if (!chatOpen) {
      setUnreadChatCount(0);
    }
    setChatOpen(!chatOpen);
    playSound("tap");
  };

  // Video Frame Iframe Builder
  const playerIframe = useMemo(() => {
    if (!session || !session.watchLink) {
      return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-zinc-500 p-8 bg-zinc-950/90 z-20">
              <Film className="w-16 h-16 mb-4 text-zinc-800 animate-pulse" />
              <p className="text-base font-bold text-zinc-400">No stream link found for this movie</p>
              <p className="text-xs text-zinc-600 mt-2 max-w-sm">Configure a direct watch link or sync playback with the browser extension.</p>
            </div>
      );
    }
    return (
      <iframe
        src={session.watchLink}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
    );
  }, [session?.watchLink]);

  // Loading Screen Layout
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-[#05050f] relative overflow-hidden cinema-page">
        <div className="cinema-projector mb-8">
          <Film className="w-8 h-8 text-[#E8587A]" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-wider text-[#F0EAF4] cinema-spotlight mb-2 animate-pulse font-serif">
          Entering Cinema Hall...
        </h2>
        <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
          Initializing Private Theater
        </p>
      </div>
    );
  }

  const isSelfReady = session.readyUsers?.includes(user?._id || "") || false;
  const readyCount = session.readyUsers?.length || 0;
  const reactions = ["❤️", "😂", "😢", "😱", "🍿", "🎉"];

  return (
    <div className="relative w-full h-screen overflow-hidden cinema-page flex select-none bg-[#05050f]">
      {/* Premium Toast Notification for Source Error */}
      <AnimatePresence>
        {sourceError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl cinema-glass-panel border border-[#E8587A]/20 shadow-[0_8px_32px_0_rgba(232,88,122,0.15)] flex items-center gap-3 max-w-md pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E8587A]/10 flex items-center justify-center text-[#E8587A] flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                {sourceError}
              </p>
            </div>
            <button 
              onClick={() => setSourceError(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Lights Dimming Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/90 transition-all duration-1000 pointer-events-none z-50",
          dimmed ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Floating Particles Layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[55]">
        <AnimatePresence>
          {floatingParticles.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "110vh", opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{
                y: "-15vh",
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1.4, 1.2, 0.7],
                rotate: r.left % 2 === 0 ? 360 : -360,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: "easeOut", delay: r.delay || 0 }}
              style={{ left: `${r.left}%` }}
              className="absolute text-5xl bottom-0 cinema-floating-particle"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cozy Cuddle Alert Banner */}
      <AnimatePresence>
        {cuddleAlert && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -40 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="text-2xl animate-bounce">🤗</div>
            <div>
              <div className="font-extrabold text-sm font-serif text-white">Cuddle Alert!</div>
              <div className="text-xs opacity-90">{cuddleAlert.sender} sends you a warm cozy cuddle!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MAIN SCREEN CONTAINER (Transitions between Lobby, Pre-Show, Watch)
          ======================================================== */}
      <div
        className={cn(
          "flex-1 h-full flex flex-col relative transition-all duration-500 ease-out",
          (chatOpen && session?.showStarted) ? "mr-[340px]" : "mr-0"
        )}
      >
        {/* LOBBY PHASE */}
        {!session.movieId && (
          <div className="w-full h-full flex flex-col p-6 sm:p-10 overflow-y-auto cinema-scrollbar relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6 mb-8">
              <div>
                <button
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit Cinema Hall</span>
                </button>
                <h1 className="text-3xl font-extrabold text-white tracking-wide font-serif cinema-spotlight">
                  Cinema Lobby
                </h1>
                <p className="text-xs text-zinc-500 mt-1">Select a movie from your shared list to watch together</p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                <Users className="w-4 h-4 text-[#E8587A]" />
                <span className="text-xs font-bold text-zinc-300">
                  {isPartnerPresent ? "Partner in Lobby" : "Waiting for partner..."}
                </span>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isPartnerPresent ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-zinc-650"
                  )}
                />
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies & TV shows..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm bg-white/[0.01] border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8587A]/30 focus:bg-white/[0.02] transition-all"
                />
              </div>

              <div className="flex bg-white/[0.02] border border-white/5 rounded-2xl p-1.5 self-start sm:self-auto shadow-inner">
                <button
                  onClick={() => setActiveFilter("watchlist")}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all",
                    activeFilter === "watchlist"
                      ? "bg-[#E8587A] text-white shadow-lg"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Watchlist
                </button>
                <button
                  onClick={() => setActiveFilter("watched")}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all",
                    activeFilter === "watched"
                      ? "bg-[#E8587A] text-white shadow-lg"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Watched History
                </button>
              </div>
            </div>

            {/* Movie List Section */}
            {loadingMovies ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E8587A] animate-spin mb-4" />
                <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Scanning Lobby database...</span>
              </div>
            ) : (
              (() => {
                const filtered = movies.filter((movie) => {
                  const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesTab = movie.status === activeFilter;
                  return matchesSearch && matchesTab;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/5 rounded-3xl bg-white/[0.005]">
                      <Film className="w-12 h-12 text-zinc-800 mb-3 animate-pulse" />
                      <p className="text-base font-bold text-zinc-400">No movies found</p>
                      <p className="text-xs text-zinc-600 max-w-xs mt-2">
                        {searchQuery
                          ? "Try searching for a different title."
                          : "Add titles to your list in the main app to select them here!"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((movie) => (
                      <div
                        key={movie._id}
                        className="cinema-lobby-card p-5 flex flex-col justify-between min-h-[160px] cursor-pointer"
                        onClick={() => handleLoadMovie(movie)}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#D4A574] bg-[#D4A574]/10 px-2.5 py-1 rounded-md">
                              {movie.type}
                            </span>
                            {movie.rating && (
                              <div className="flex items-center gap-1 text-[#D4A574]">
                                <Star className="w-3.5 h-3.5 fill-[#D4A574] stroke-none" />
                                <span className="text-xs font-black">{movie.rating}</span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white tracking-wide mt-2 line-clamp-2">
                            {movie.title}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-4 border-t border-white/5 pt-4">
                          <span className="text-[10px] font-bold text-zinc-650 flex items-center gap-1">
                            {movie.watchLink ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Watch Link Available</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                <span>No watch link</span>
                              </>
                            )}
                          </span>
                          <button className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-[#E8587A] text-white text-xs font-bold transition-all cursor-pointer">
                            Load 🎬
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* PRE-SHOW / READY ROOM PHASE */}
        {session.movieId && !session.showStarted && (
          <div className="w-full h-full flex flex-col p-6 sm:p-10 justify-between items-center cinema-curtains relative z-10">
            {/* Top Back bar */}
            <div className="w-full flex justify-between items-center border-b border-white/5 pb-4">
              <button
                onClick={handleChangeMovie}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose Different Movie</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400">
                <Users className="w-4 h-4 text-[#E8587A]" />
                <span className="text-xs font-bold">
                  {isPartnerPresent ? "Partner in Hall" : "Waiting for partner..."}
                </span>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isPartnerPresent ? "bg-emerald-500 animate-pulse" : "bg-zinc-650"
                  )}
                />
              </div>
            </div>

            {/* Central Movie Title Board */}
            <div className="my-auto text-center flex flex-col items-center max-w-xl px-4">
              <Film className="w-16 h-16 text-[#D4A574] animate-pulse mb-6" />
              <span className="text-[10px] font-black tracking-widest text-[#E8587A] uppercase bg-[#E8587A]/10 px-3 py-1 rounded-full">
                Theater Setup
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide mt-4 mb-3 font-serif cinema-spotlight leading-tight">
                {session.movieTitle}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-md">
                {!isPartnerPresent
                  ? "Waiting for your partner to enter. Get cozy, prepare the drinks, and set the snacks! 🍿"
                  : "Both watching seats are filled! Confirm readiness to open the screen curtains. 🎬"}
              </p>

              {/* Ready Status Circles */}
              <div className="flex items-center gap-12 mt-10">
                {/* Self Status */}
                <div className="flex flex-col items-center gap-3">
                  <div className={cn("cinema-ready-orb", isSelfReady && "ready")}>
                    <Users className="w-6 h-6 text-zinc-500" />
                  </div>
                  <span className="text-xs font-extrabold text-zinc-400">You</span>
                </div>

                {/* Partner Status */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={cn(
                      "cinema-ready-orb",
                      (readyCount >= 2 || (readyCount === 1 && !isSelfReady)) && "ready"
                    )}
                  >
                    <Users className="w-6 h-6 text-zinc-500" />
                  </div>
                  <span className="text-xs font-extrabold text-zinc-400">Partner</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-10">
                <button
                  onClick={handleToggleReady}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4.5 rounded-2xl font-extrabold text-sm shadow-xl transition-all cursor-pointer active:scale-95",
                    isSelfReady
                      ? "bg-zinc-800 text-zinc-450 hover:bg-zinc-750 border border-white/5"
                      : "bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white shadow-[#E8587A]/15 hover:brightness-110"
                  )}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSelfReady
                      ? `Ready! Waiting (${readyCount}/2)`
                      : "I am Ready to Watch 🍿"}
                  </span>
                </button>
              </div>
            </div>

            {/* Cozy Snacks Checklist Card (Pre-show bottom) */}
            <div className="cinema-glass-panel p-5 max-w-md w-full border border-white/5">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <Coffee className="w-4 h-4 text-[#D4A574]" />
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Configure Date Snacks</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "popcorn", label: "🍿 Popcorn" },
                  { key: "pizza", label: "🍕 Pizza" },
                  { key: "soda", label: "🥤 Drinks" },
                  { key: "candy", label: "🍫 Candy" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleToggleSnack(item.key)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer",
                      snacks[item.key]
                        ? "bg-[#E8587A]/10 border-[#E8587A]/30 text-white"
                        : "bg-white/[0.01] border-white/5 text-zinc-550 hover:bg-white/[0.02]"
                    )}
                  >
                    <span>{item.label}</span>
                    {snacks[item.key] && <Check className="w-3.5 h-3.5 text-[#E8587A]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* THEATER ACTIVE WATCHING PHASE */}
        {session.movieId && session.showStarted && (
          <div className="w-full h-full relative flex flex-col justify-between items-center z-10 bg-black">
            {/* Auto-Hiding Header Bar */}
            <div
              className={cn(
                "cinema-bar-transition fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-40",
                chatOpen ? "pr-[364px]" : "pr-6",
                !controlsVisible && "cinema-bar-hidden cinema-header-hidden"
              )}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={handleChangeMovie}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#D4A574] bg-[#D4A574]/15 px-1.5 py-0.5 rounded">
                      {session.movieType}
                    </span>
                    <h2 className="text-sm font-extrabold text-white font-serif tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {session.movieTitle}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Status and Toggle Controls */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-300">
                  <Users className="w-3.5 h-3.5 text-[#E8587A]" />
                  <span>Co-Watching</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Extension status indicator */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-bold border tracking-wide uppercase",
                    isExtensionActive
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-450 animate-pulse"
                  )}
                  title={isExtensionActive ? "Browser sync active" : "Sync extension not active"}
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden xs:inline">{isExtensionActive ? "Active" : "Sync Offline"}</span>
                </div>

                {/* Chat Toggle Button */}
                <button
                  onClick={toggleChat}
                  className={cn(
                    "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer",
                    chatOpen ? "bg-[#E8587A] text-white" : "bg-white/5 hover:bg-white/10 text-zinc-300"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  {!chatOpen && unreadChatCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#E8587A] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Video Player Display Container */}
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {playerIframe}

              {/* Extension Inactive Warning Overlay */}
              {!isExtensionActive && (
                <div className="absolute top-20 left-6 right-6 sm:left-auto sm:right-6 max-w-sm p-4.5 rounded-2xl bg-zinc-950/95 border border-white/5 text-zinc-400 text-xs font-semibold leading-relaxed flex flex-col gap-2.5 z-30 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Info className="w-4 h-4 text-[#D4A574]" />
                    <span>Playback Sync Extension Inactive</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    To auto-sync playing, pausing, and searching, enable the **Love Cinema Sync** extension.
                  </p>
                  <a
                    href="https://github.com/SamarthPD-21/Love-Cinema-Sync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 bg-[#E8587A] hover:bg-[#A82E5E] text-white font-bold py-2 rounded-xl shadow-md w-full text-[10px] mt-1 transition-colors"
                  >
                    <span>Get Extension</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Auto-Hiding Control Bar */}
            <div
              className={cn(
                "cinema-bar-transition fixed bottom-6 left-1/2 -translate-x-1/2 cinema-glass-panel p-3 flex flex-wrap items-center gap-4 z-40 max-w-[90%] md:max-w-max",
                !controlsVisible && "cinema-bar-hidden cinema-controls-hidden"
              )}
            >
              {/* Left group: Source/Server select */}
              <div className="flex items-center gap-2 border-r border-white/5 pr-4">
                {resolvingSource ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 px-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8587A]" />
                    <span>Resolving...</span>
                  </div>
                ) : (
                  <select
                    value={activeSource}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="bg-zinc-900/60 border border-white/5 text-[10px] font-bold rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-[#E8587A]/30 cursor-pointer"
                  >
                    <option value="default">🎬 1HD (Default)</option>
                    <option value="vidsrc_to">⚡ VidSrc.to</option>
                    <option value="vidsrc_me">⚡ VidSrc.me</option>
                    <option value="vidsrcme_ru">🇷🇺 VidSrcMe.ru</option>
                    <option value="vidsrc_xyz">⚡ VidSrc.xyz</option>
                    <option value="two_embed">🎞️ 2Embed</option>
                    <option value="multiembed">🔗 MultiEmbed</option>
                    <option value="embedsu">🎥 Embed.su</option>
                    <option value="autoembed">🤖 AutoEmbed</option>
                    <option value="smashystream">💥 SmashyStream</option>
                  </select>
                )}

                {activeSource === "default" && (
                  <select
                    value={session.activeServer || "upcloud"}
                    onChange={(e) => handleServerChange(e.target.value)}
                    className="bg-zinc-900/60 border border-white/5 text-[10px] font-bold rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-[#E8587A]/30 cursor-pointer"
                  >
                    <option value="upcloud">UpCloud</option>
                    <option value="vidmoly">Vidmoly</option>
                    <option value="videasy">Videasy</option>
                    <option value="vidcloud">Vidcloud</option>
                    <option value="vidfast">Vidfast</option>
                  </select>
                )}
              </div>

              {/* Center group: Fun triggers */}
              <div className="flex items-center gap-2 border-r border-white/5 pr-4">
                <button
                  onClick={handleToggleLights}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95 border",
                    dimmed
                      ? "bg-[#D4A574]/20 border-[#D4A574]/40 text-[#D4A574]"
                      : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
                  )}
                  title="Dim/brighten the ambient background"
                >
                  💡 Lights
                </button>

                <button
                  onClick={handleThrowPopcorn}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  🍿 Fight
                </button>

                <button
                  onClick={handleSendCuddle}
                  className="bg-[#E8587A]/10 border border-[#E8587A]/25 hover:bg-[#E8587A]/20 text-[#E8587A] px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  🤗 Cuddle
                </button>
              </div>

              {/* Right group: Reaction emoji buttons */}
              <div className="flex items-center gap-1.5">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-sm transition-all cursor-pointer active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          SIDEBAR CHAT DRAWER PANEL (Slides in from right)
          ======================================================== */}
      <div className={cn("cinema-chat-drawer cinema-glass-panel flex flex-col", (chatOpen && session?.showStarted) && "open")}>
        {/* Chat Drawer Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#E8587A]" />
            <h3 className="text-sm font-extrabold text-white font-serif tracking-wide">Theater Chat</h3>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages Log Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 cinema-scrollbar">
          {chatMessages.length === 0 ? (
            <div className="my-auto flex flex-col items-center text-center p-4">
              <Smile className="w-8 h-8 text-zinc-800 mb-2 animate-bounce" />
              <p className="text-xs font-bold text-zinc-500">No messages yet</p>
              <p className="text-[10px] text-zinc-700 mt-1 max-w-[180px]">Send a message to start chatting during your movie date!</p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex flex-col max-w-[85%] gap-1", msg.isSelf ? "self-end items-end" : "self-start items-start")}
              >
                <span className="text-[9px] font-bold text-zinc-500 px-1">{msg.senderName}</span>
                <div
                  className={cn(
                    "p-3 rounded-2xl text-xs leading-relaxed break-words",
                    msg.isSelf
                      ? "bg-gradient-to-br from-[#E8587A] to-[#BE3A6E] text-white rounded-tr-none shadow-md shadow-[#BE3A6E]/5"
                      : "bg-white/5 border border-white/5 text-zinc-200 rounded-tl-none"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Send Form */}
        <form onSubmit={handleSendChat} className="p-4 border-t border-white/5 bg-black/20 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E8587A]/30 transition-colors"
          />
          <button
            type="submit"
            className="w-9 h-9 rounded-xl bg-[#E8587A] hover:bg-[#BE3A6E] text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-md shadow-[#BE3A6E]/10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
