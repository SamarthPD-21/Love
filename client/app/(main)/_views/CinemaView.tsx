"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Film, Heart, Smile, Sparkles, Flame, Check, Loader2, Search, RefreshCw, Star, ExternalLink } from "lucide-react";
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

interface CinemaViewProps {
  onBackToWatchlist: () => void;
}

export default function CinemaView({ onBackToWatchlist }: CinemaViewProps) {
  const { user } = useAuthStore();
  const { playSound } = useSoundEffects();
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
  const [cachedAlternativeLinks, setCachedAlternativeLinks] = useState<Record<string, { vidsrc_to: string; vidsrc_me: string }>>({});

  useEffect(() => {
    if (session?.watchLink) {
      if (session.watchLink.includes("vidsrc.to")) {
        setActiveSource("vidsrc_to");
      } else if (session.watchLink.includes("vidsrc.me")) {
        setActiveSource("vidsrc_me");
      } else {
        setActiveSource("default");
      }
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
        const typeFilter =
          session.movieType === "movie"
            ? `VALUES ?class { wd:Q11424 wd:Q29168811 wd:Q24869 }`
            : `VALUES ?class { wd:Q5398426 wd:Q21191270 wd:Q63952888 }`;

        const escapedTitle = session.movieTitle.replace(/"/g, '\\"');
        const query = `
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
        const url = `${endpoint}?query=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            Accept: "application/sparql-results+json",
          },
        });

        if (response.ok) {
          const json = await response.json();
          const bindings = json.results?.bindings ?? [];
          if (bindings.length > 0 && bindings[0].imdbID) {
            const imdbId = bindings[0].imdbID.value;
            const mediaType = session.movieType === "movie" ? "movie" : "tv";
            links = {
              vidsrc_to: `https://vidsrc.to/embed/${mediaType}/${imdbId}`,
              vidsrc_me: `https://vidsrc.me/embed/${mediaType}/${imdbId}`,
            };
            setCachedAlternativeLinks((prev) => ({
              ...prev,
              [session.movieId]: links!,
            }));
          }
        }
      } catch (e) {
        console.error("Failed to query Wikidata alternative links:", e);
      } finally {
        setResolvingSource(false);
      }
    }

    if (links) {
      const targetUrl = sourceKey === "vidsrc_to" ? links.vidsrc_to : links.vidsrc_me;
      socket.emit("cinema_select_movie", {
        relationshipId: getRelationshipId(user.relationshipId),
        movieId: session.movieId,
        movieTitle: session.movieTitle,
        movieType: session.movieType,
        watchLink: targetUrl,
      });
    } else {
      alert("Unable to automatically resolve an alternative IMDB link for this title.");
      setActiveSource("default");
    }
  };

  // Lobby states
  const [movies, setMovies] = useState<any[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"watchlist" | "watched">("watchlist");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

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

  useEffect(() => {
    if (!socket || !user || !user.relationshipId) return;

    const relId = getRelationshipId(user.relationshipId);

    // Join Cinema session on mount & reconnects
    const handleConnect = () => {
      console.log("Cinema: Socket connected, joining room:", relId);
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
        console.log("Is partner present:", present, "Participants:", activeSession.participants);
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
  }, [user?.relationshipId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const triggerReaction = (emoji: string, count = 1) => {
    const batch: FloatingParticle[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(),
      emoji,
      left: Math.random() * 80 + 10,
      delay: Math.random() * 0.4,
    }));
    setFloatingParticles((prev) => [...prev, ...batch]);
    const t = setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 3000);
    timeoutsRef.current.push(t);
  };

  const triggerPopcornFight = () => {
    const batch: FloatingParticle[] = Array.from({ length: 15 }).map(() => ({
      id: Math.random().toString(),
      emoji: "🍿",
      left: Math.random() * 80 + 10,
      delay: Math.random() * 0.5,
    }));
    setFloatingParticles((prev) => [...prev, ...batch]);
    const t = setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((r) => !batch.some((b) => b.id === r.id)));
    }, 3000);
    timeoutsRef.current.push(t);
  };

  const handleSendReaction = (emoji: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    triggerReaction(emoji, 1);
    playSound("pop");
    socket.emit("cinema_reaction", {
      relationshipId: relId,
      emoji,
    });
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
    socket.emit("cinema_dim_lights", {
      relationshipId: relId,
      dimmed: newDim,
    });
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
    socket.emit("cinema_sync_snacks", {
      relationshipId: relId,
      snacks: updated,
    });
  };

  const handleServerChange = (serverKey: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_change_server", {
      relationshipId: relId,
      server: serverKey,
    });
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

  const reactions = ["❤️", "😂", "😢", "😱", "🍿", "🎉"];

  const playerIframe = useMemo(() => {
    if (!session || !session.watchLink) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-8 bg-zinc-950 animate-fade-in">
          <Film className="w-12 h-12 mb-3 text-zinc-700 animate-pulse" />
          <p className="text-sm font-semibold">No Watch Link found for this Movie.</p>
          <p className="text-xs text-zinc-500 mt-1">Please configure a link or start a second-screen session.</p>
        </div>
      );
    }
    return (
      <iframe
        src={session.watchLink}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
      />
    );
  }, [session?.watchLink]);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-center max-w-lg mx-auto">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <h3 className="text-lg font-bold text-foreground">Connecting to Cinema...</h3>
        <p className="text-xs text-muted-foreground mt-1">Establishing secure couple channel</p>
      </div>
    );
  }

  const isSelfReady = session.readyUsers?.includes(user?._id || "") || false;
  const readyCount = session.readyUsers?.length || 0;

  return (
    <div className="relative w-full max-w-6xl mx-auto min-h-[calc(100vh-12rem)]">
      {/* Immersive Cinema Link Banner */}
      <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0 animate-pulse">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Want a real movie date experience?</h4>
            <p className="text-xs text-muted-foreground">Try the new immersive full-screen cinema hall with integrated side chat.</p>
          </div>
        </div>
        <Link
          href="/cinema"
          className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-black transition-all cursor-pointer shadow-sm shadow-primary/15 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          Launch Full-screen Theater 🍿
        </Link>
      </div>

      {/* Light dimming overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/85 transition-all duration-1000 pointer-events-none z-30",
          dimmed ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Floating particles layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        <AnimatePresence>
          {floatingParticles.map((r) => (
            <motion.div
              key={r.id}
              initial={{ y: "100%", opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{
                y: "-10%",
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1.6, 1.4, 0.8],
                rotate: r.left % 2 === 0 ? 360 : -360,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: "easeOut", delay: r.delay || 0 }}
              style={{ left: `${r.left}%` }}
              className="absolute text-5xl bottom-0"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cuddle Alert Toast Overlay */}
      <AnimatePresence>
        {cuddleAlert && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-pink-400/30"
          >
            <div className="text-2xl">🤗</div>
            <div>
              <div className="font-extrabold text-sm">Cuddle Alert!</div>
              <div className="text-xs opacity-90">{cuddleAlert.sender} sends you a cozy warm cuddle!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Left Column: Embed Player / Movie Selector */}
        <div className="lg:col-span-2 flex flex-col gap-6 z-40">
          {!session.movieId ? (
            <div className="card-cozy p-6 flex flex-col gap-6 min-h-[450px] border border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-foreground font-serif">Cinema Lobby</h3>
                  <p className="text-xs text-muted-foreground">Select a movie from your list to watch together</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/40 border border-border/60 shadow-sm text-foreground self-start">
                  <Users className="w-4 h-4 text-primary animate-pulse" />
                  <span>{isPartnerPresent ? "Partner in Lobby" : "Waiting for partner"}</span>
                  <span className={cn("w-2 h-2 rounded-full ml-1", isPartnerPresent ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" : "bg-zinc-400")} />
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies & shows..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-[0_0_12px_rgba(232,88,122,0.06)] transition-all duration-200"
                  />
                </div>
                <div className="flex bg-muted/40 border border-border/60 rounded-xl p-1 self-start sm:self-auto shadow-inner">
                  <button
                    onClick={() => setActiveFilter("watchlist")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all",
                      activeFilter === "watchlist"
                        ? "bg-primary text-white shadow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Watchlist
                  </button>
                  <button
                    onClick={() => setActiveFilter("watched")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all",
                      activeFilter === "watched"
                        ? "bg-primary text-white shadow"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Watched History
                  </button>
                </div>
              </div>

              {/* Movie Grid/List */}
              {loadingMovies ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Loading movie selection...</span>
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
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/60 rounded-2xl bg-white/[0.005]">
                        <Film className="w-10 h-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-semibold text-foreground">No matches found</p>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          {searchQuery
                            ? "Try searching for a different title or keyword."
                            : "Add some titles to your list in the Watchlist tab to choose them here!"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                      {filtered.map((movie) => (
                        <div
                          key={movie._id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-primary/25 hover:from-card hover:to-primary/[0.01] transition-all duration-300 hover:shadow-md group relative overflow-hidden gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/10 to-accent/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-2 transition-all">
                              <Film className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex flex-col gap-1.5 justify-center">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md leading-none">
                                  {movie.type}
                                </span>
                                {movie.rating && (
                                  <div className="flex items-center gap-0.5 text-amber-500 leading-none">
                                    <Star className="w-3 h-3 fill-amber-500 stroke-none" />
                                    <span className="text-[10px] font-black">{movie.rating}</span>
                                  </div>
                                )}
                              </div>
                              <h4 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                                {movie.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline font-bold">
                              {movie.watchLink ? "🔗 Stream Ready" : "🔌 Search"}
                            </span>
                            <button
                              onClick={() => handleLoadMovie(movie)}
                              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm hover:shadow-md shadow-primary/10"
                            >
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
          ) : !session.showStarted ? (
            <div className="card-cozy p-8 flex flex-col items-center justify-center text-center min-h-[400px] gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              
              <Film className="w-16 h-16 text-amber-500 animate-pulse" />
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 py-1 px-3 rounded-full uppercase tracking-wider">
                  Theater Date Setup
                </span>
                <h2 className="text-2xl font-extrabold text-foreground mt-2">
                  {session.movieTitle}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {!isPartnerPresent
                    ? "Waiting for your partner to join the Cinema Room. Get comfortable and prepare your snacks! 🍿"
                    : "Both of you are here! Confirm you are ready and click enter to dim the lights and start the show! 🎬"}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
                <button
                  onClick={handleToggleReady}
                  className={cn(
                    "flex items-center gap-2 px-8 py-4 rounded-2xl font-extrabold text-base shadow-lg transition-all cursor-pointer",
                    isSelfReady
                      ? "bg-zinc-700 hover:bg-zinc-800 text-zinc-300 border border-zinc-650"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse"
                  )}
                >
                  <Users className="w-5 h-5" />
                  <span>
                    {isSelfReady
                      ? `Ready! Waiting for partner (${readyCount}/2) ⏳`
                      : "Ready to Watch 🍿"}
                  </span>
                </button>
                <button
                  onClick={handleChangeMovie}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-background border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-sm transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Choose Different Movie</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="card-cozy p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 py-1 px-2.5 rounded-full uppercase tracking-wider">
                    {session.movieType}
                  </span>
                  <h2 className="text-2xl font-extrabold text-foreground mt-2 leading-tight">
                    {session.movieTitle}
                  </h2>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-background border border-border/80 shadow-sm text-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span>Co-Watching 🍿</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
                  </div>
                  
                  {/* Extension Active Badge */}
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wide border uppercase shadow-sm",
                    isExtensionActive
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse"
                  )}>
                    <Sparkles className="w-3 h-3" />
                    <span>{isExtensionActive ? "Extension Active ⚡" : "Extension Inactive ⚠️"}</span>
                  </div>
                </div>
              </div>

              {/* Extension Warning Banner */}
              {!isExtensionActive && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold leading-relaxed flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>⚠️ Playback Sync Extension Missing or Disabled</span>
                  </div>
                  <p className="opacity-90">
                    To sync play/pause/seek controls and size the video player correctly, make sure the **Love Cinema Sync** extension is enabled in your browser.
                  </p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    💡 **Incognito / Private Mode:** If you are using a private window, open `chrome://extensions` in your browser, click details on the extension, and enable **&ldquo;Allow in incognito&rdquo;**.
                  </p>
                  
                  {/* Download Link Button */}
                  <a
                    href="https://github.com/SamarthPD-21/Love-Cinema-Sync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-bold py-2.5 px-4 rounded-xl shadow-md w-fit text-xs mt-1"
                  >
                    <span>Download Extension</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Embedded Iframe Player */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-border/80 shadow-2xl">
                {playerIframe}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 p-4 rounded-xl border border-border/40 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    Player Source:
                  </span>
                  {resolvingSource ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <select
                      value={activeSource}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      className="bg-background border border-border/80 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="default">Source 1 (1HD)</option>
                      <option value="vidsrc_to">Source 2 (VidSrc.to)</option>
                      <option value="vidsrc_me">Source 3 (vidsrc.me)</option>
                    </select>
                  )}
                </div>

                {activeSource === "default" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      1HD Server:
                    </span>
                    <select
                      value={session.activeServer || "upcloud"}
                      onChange={(e) => handleServerChange(e.target.value)}
                      className="bg-background border border-border/80 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="upcloud">UpCloud</option>
                      <option value="vidmoly">Vidmoly</option>
                      <option value="videasy">Videasy</option>
                      <option value="vidcloud">Vidcloud</option>
                      <option value="vidfast">Vidfast</option>
                    </select>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleChangeMovie}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-background border border-border/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Choose Different Movie</span>
                  </button>
                  <button
                    onClick={handleToggleLights}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border",
                      dimmed
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-background border-border/80 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{dimmed ? "Turn Lights ON" : "Dim Lights"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cozy Interaction Zone Card */}
          <div className="card-cozy p-6 flex flex-col gap-4 border border-border/60">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider font-serif">
              Cozy Interaction Zone
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleThrowPopcorn}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-500/10 hover:shadow-lg"
                >
                  <span>🍿 Popcorn Fight!</span>
                </button>

                <button
                  onClick={handleSendCuddle}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-500/10 hover:shadow-lg"
                >
                  <span>🤗 Send Cuddle</span>
                </button>
              </div>

              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-border/60 pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto justify-center sm:justify-start">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-background border border-border/60 hover:bg-primary/5 hover:border-primary/30 text-lg transition-all cursor-pointer active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Snack checklist & Ephemeral Chat */}
        <div className="flex flex-col gap-6 z-40">
          {/* Snack checklist */}
          <div className="card-cozy p-6 flex flex-col gap-4 border border-border/60">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider font-serif">
              Snack Bar Prep
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "popcorn", label: "🍿 Popcorn" },
                { key: "pizza", label: "🍕 Pizza" },
                { key: "soda", label: "🥤 Drinks" },
                { key: "candy", label: "🍫 Candy" },
              ].map((snack) => (
                <button
                  key={snack.key}
                  onClick={() => handleToggleSnack(snack.key)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all cubic-bezier(0.4, 0, 0.2, 1) cursor-pointer active:scale-[0.97]",
                    snacks[snack.key]
                      ? "bg-emerald-550/10 border-emerald-550/35 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5"
                      : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/10"
                  )}
                >
                  <span>{snack.label}</span>
                  {snacks[snack.key] && (
                    <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                      <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3px]" />
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chatbox */}
          <div className="card-cozy p-6 flex flex-col h-[400px] border border-border/60">
            <div className="flex items-center gap-2 border-b border-border/60 pb-4 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider font-serif">
                Cinema Date Chat
              </h3>
            </div>

            {/* Message history */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 cinema-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Smile className="w-8 h-8 mb-2 opacity-35 animate-bounce text-primary" />
                  <p className="text-xs font-bold text-muted-foreground">No messages yet</p>
                  <p className="text-[10px] text-zinc-400 mt-1 max-w-[180px] leading-relaxed">
                    Grab your snacks, dim the lights, and start chatting during your movie date!
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] gap-0.5",
                      msg.isSelf ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <span className="text-[9px] text-muted-foreground font-semibold px-1">
                      {msg.senderName}
                    </span>
                    <div
                      className={cn(
                        "px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words",
                        msg.isSelf
                          ? "bg-gradient-to-br from-primary to-primary-hover text-white rounded-tr-none shadow-sm shadow-primary/5"
                          : "bg-background border border-border/80 text-foreground rounded-tl-none"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Text Input area */}
            <form onSubmit={handleSendChat} className="flex gap-2 mt-4 pt-4 border-t border-border/60 bg-transparent">
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:shadow-[0_0_12px_rgba(232,88,122,0.06)] transition-all duration-200"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow shadow-primary/10"
              >
                <Send className="w-4 h-4 fill-white" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
