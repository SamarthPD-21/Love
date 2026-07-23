"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Info,
  Link2,
  Play,
  Sticker,
  SmilePlus,
  Clock,
  BellOff,
  Bell,
  ScanSearch,
  Maximize,
  Maximize2
} from "lucide-react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn, getRelationshipId } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");
  return `${formattedMins}:${formattedSecs}`;
}

// --- Dynamic Anime Classification Engine (AniList + MAL API + Cache) ---
const animeClassificationCache = new Map<string, boolean>();

async function isAnimeTitleAsync(title?: string, type?: string, genre?: string, category?: string): Promise<boolean> {
  if (!title) return false;

  // 1. Direct Metadata Check
  const typeLower = type?.toLowerCase() || "";
  const genreLower = genre?.toLowerCase() || "";
  const catLower = category?.toLowerCase() || "";
  if (
    typeLower === "anime" || 
    genreLower.includes("anime") || 
    catLower.includes("anime")
  ) {
    return true;
  }

  const cleanTitle = title.trim().toLowerCase();
  if (animeClassificationCache.has(cleanTitle)) {
    return animeClassificationCache.get(cleanTitle)!;
  }

  // 2. Dynamic API Classification Engine (AniList GraphQL API)
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
              title {
                english
                romaji
              }
            }
          }
        `,
        variables: { search: title },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const media = data?.data?.Media;
      if (media && media.title) {
        const eng = (media.title.english || "").toLowerCase();
        const rom = (media.title.romaji || "").toLowerCase();
        if (eng.includes(cleanTitle) || cleanTitle.includes(eng) || rom.includes(cleanTitle) || cleanTitle.includes(rom)) {
          animeClassificationCache.set(cleanTitle, true);
          return true;
        }
      }
    }
  } catch {
    // Fallback if API unreachable
  }

  // 3. Dynamic Fallback Classification Engine (Jikan / MAL API)
  try {
    const malRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
    if (malRes.ok) {
      const malData = await malRes.json();
      if (malData.data && malData.data.length > 0) {
        const malItem = malData.data[0];
        const malTitle = (malItem.title || "").toLowerCase();
        const malEng = (malItem.title_english || "").toLowerCase();
        if (malTitle.includes(cleanTitle) || cleanTitle.includes(malTitle) || malEng.includes(cleanTitle) || cleanTitle.includes(malEng)) {
          animeClassificationCache.set(cleanTitle, true);
          return true;
        }
      }
    }
  } catch {
    // Fallback
  }

  animeClassificationCache.set(cleanTitle, false);
  return false;
}

function isAnimeTitle(title?: string, type?: string, genre?: string, category?: string): boolean {
  if (!title) return false;
  if (type === "anime" || genre?.toLowerCase().includes("anime") || category?.toLowerCase().includes("anime")) return true;
  const cleanTitle = title.trim().toLowerCase();
  if (animeClassificationCache.has(cleanTitle)) {
    return animeClassificationCache.get(cleanTitle)!;
  }
  isAnimeTitleAsync(title, type, genre, category);
  return false;
}

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
  type?: "text" | "sticker";
}


interface DetectedControlItem {
  label: string;
  active: boolean;
  index: number;
}

interface DetectedControls {
  servers: DetectedControlItem[];
  languages: DetectedControlItem[];
  episodes: DetectedControlItem[];
  quality: DetectedControlItem[];
}

const STREAM_SOURCES = [
  { key: 'cineby', label: 'Cineby.at (Primary)', emoji: '🌟' },
  { key: 'default', label: '1HD.to', emoji: '🎬' },
  { key: 'vidsrc_to', label: 'VidSrc.to', emoji: '⚡' },
  { key: 'vidsrc_me', label: 'VidSrc.me', emoji: '⚡' },
  { key: 'two_embed', label: '2Embed', emoji: '🎞️' },
  { key: 'embedsu', label: 'Embed.su', emoji: '🎥' },
  { key: 'miruro', label: 'Miruro (Anime)', emoji: '🌸' },
  { key: 'bflix', label: 'BFlix', emoji: '🅱️' },
  { key: 'vidsrcme_ru', label: 'VidSrcMe.ru', emoji: '🇷🇺' },
  { key: 'vidsrc_xyz', label: 'VidSrc.xyz', emoji: '⚡' },
  { key: 'multiembed', label: 'MultiEmbed', emoji: '🔗' },
  { key: 'autoembed', label: 'AutoEmbed', emoji: '🤖' },
  { key: 'smashystream', label: 'SmashyStream', emoji: '💥' },
] as const;

export default function CinemaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { playSound } = useSoundEffects();

  // Core Cinema States
  const [session, setSession] = useState<CinemaSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number, swayOffset?:number}[]>([]);
  const animationFrameRef = useRef<number>(0);
  const [isPartnerPresent, setIsPartnerPresent] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; icon: string } | null>(null);
  const [cuddleAlert, setCuddleAlert] = useState<{ visible: boolean; sender: string } | null>(null);
  const [snacks, setSnacks] = useState<Record<string, boolean>>({
    popcorn: false,
    pizza: false,
    soda: false,
    candy: false,
  });
  const [countdown, setCountdown] = useState<number|null>(null);
  const [latency, setLatency] = useState<number|null>(null);

  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRespondingToSocketRef = useRef(false);

  // New UI specific states
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const showActionToast = useCallback((message: string, icon = "🎬") => {
    setActionToast({ message, icon });
  }, []);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => setActionToast(null), 3000);
    return () => clearTimeout(timer);
  }, [actionToast]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();
  // Keyboard shortcuts (Phase 5.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case ' ':
          if (session?.showStarted) {
            e.preventDefault();
            const relId = user?.relationshipId ? (typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id) : "";
            if (session.status === 'playing') {
              if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'paused' });
            } else {
              if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'playing' });
            }
          }
          break;
        case 'f':
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen();
          }
          break;
        case 'm':
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case 'd':
          break;
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, socket, user]);

  // Smart auto-pause on tab switch (Phase 5.5)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session?.status === 'playing') {
        const relId = user?.relationshipId ? (typeof user.relationshipId === "string" ? user.relationshipId : user.relationshipId._id) : "";
        if (relId) socket?.emit('cinema_state_change', { relationshipId: relId, status: 'paused' });
      } else if (!document.hidden && session?.showStarted) {
        showActionToast("Welcome back! Press play to resume", "👋");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session, socket, user, showActionToast]);

  // Sync heartbeat indicator (Phase 5.6)
  useEffect(() => {
    if (!session?.showStarted || !socket) return;
    
    const interval = setInterval(() => {
      socket.emit('cinema_heartbeat_ping', { timestamp: Date.now() });
    }, 10000);

    const handlePong = (data: { timestamp: number }) => {
      setLatency(Date.now() - data.timestamp);
    };

    socket.on('cinema_heartbeat_pong', handlePong);
    return () => {
      clearInterval(interval);
      socket.off('cinema_heartbeat_pong', handlePong);
    };
  }, [session?.showStarted, socket]);


  // Chat Enhancement States
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [activeStickerPack, setActiveStickerPack] = useState<string>("romantic");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "settings">("chat");

  // Language States
  const [subtitleLang, setSubtitleLang] = useState<string>("en");
  const [audioLang, setAudioLang] = useState<string>("original");

  // Cinema Sync Controls from extension (via postMessage)
  const [detectedControls, setDetectedControls] = useState<DetectedControls | null>(null);

  // Sticker Packs Data
  const stickerPacks: Record<string, { label: string; icon: string; stickers: string[] }> = {
    romantic: {
      label: "Romantic",
      icon: "💕",
      stickers: ["💏", "💑", "💝", "💗", "🫶", "🥰", "😘", "💐", "🌹", "🫂", "💋", "💞", "💓", "💘", "😍", "🥺", "🤗", "💌", "👩‍❤️‍👨", "💟"],
    },
    reactions: {
      label: "Reactions",
      icon: "🤣",
      stickers: ["🤣", "😭", "🤯", "🥵", "💀", "👏", "🙈", "🫠", "🤤", "😈", "🫣", "😤", "🥶", "🤡", "👀", "🫡", "😎", "🤩", "😬", "🫢"],
    },
    cozy: {
      label: "Cozy Vibes",
      icon: "🧸",
      stickers: ["🧸", "🕯️", "🌙", "☕", "🍿", "🎬", "🛋️", "🫕", "🧁", "🎶", "🌸", "🦋", "🍰", "🎀", "🫧", "✨", "🌻", "🍫", "🥂", "🎠"],
    },
    kaomoji: {
      label: "Kaomoji",
      icon: "ʕ•ᴥ•ʔ",
      stickers: [
        "(づ￣ ³￣)づ",
        "♡(ˆ‿ˆ)",
        "(っ˘з(˘⌣˘ )",
        "₍ᐢ..ᐢ₎♡",
        "(⁄ ⁄•⁄ω⁄•⁄ ⁄)",
        "(*≧ω≦)",
        "(´,,•ω•,,)♡",
        "( ˘ ³˘)♥",
        "ʕ•ᴥ•ʔ",
        "(◕‿◕✿)",
        "( ˶ˆᗜˆ˵ )",
        "(ᵔᴥᵔ)",
        "♡( ◡‿◡ )",
        "( ⸝⸝´꒳`⸝⸝)",
        "٩(◕‿◕｡)۶",
        "(✿◠‿◠)",
        "꒰ ˶• ༝ •˶꒱",
        "( ⓛ ω ⓛ *)",
        "ε(´•₎ •`)з",
        "(ノ´ヮ`)ノ*: ・゚✧",
      ],
    },
  };

  // Quick emoji row for chat
  const quickEmojis = ["💖", "😂", "🔥", "😍", "👀", "😭", "🥺", "🫶"];


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

  // Listen for Cinema Sync Controls data from the extension (via postMessage from iframe)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "LOVE_SYNC_CONTROLS_DATA") {
        setDetectedControls(event.data.controls);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Send a click command to the extension inside the iframe
  const sendControlClick = (category: string, index: number) => {
    // Find the iframe element and post message to it
    const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "LOVE_SYNC_CLICK_CONTROL", category, index }, "*");
      playSound("tap");
    }
  };

  // Aspect ratio fill state
  const [videoFitMode, setVideoFitMode] = useState<"contain" | "cover" | "fill">("cover");

  const handleToggleAspectMode = () => {
    const nextMode = videoFitMode === "contain" ? "cover" : videoFitMode === "cover" ? "fill" : "contain";
    setVideoFitMode(nextMode);
    playSound("tap");

    const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "LOVE_SYNC_SET_ASPECT_RATIO", mode: nextMode }, "*");
    }
  };

  // Request a rescan from the extension
  const requestControlRescan = () => {
    const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "LOVE_SYNC_RESCAN_CONTROLS" }, "*");
      playSound("tap");
    }
  };

  // Player Source switching states
  const [activeSource, setActiveSource] = useState<string>("default");
  const [resolvingSource, setResolvingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [cachedAlternativeLinks, setCachedAlternativeLinks] = useState<Record<string, Record<string, string>>>({});
  const [gdriveLink, setGdriveLink] = useState("");
  const [gdriveTitle, setGdriveTitle] = useState("");
  const [gdrivePlayerMode, setGdrivePlayerMode] = useState<"iframe" | "html5">("iframe");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const localFileUrl = useMemo(() => {
    return localFile ? URL.createObjectURL(localFile) : "";
  }, [localFile]);

  // Map of all IMDB-based embed sources (key → url builder fn)
  const altSourceBuilders: Record<string, (imdbId: string, mediaType: string, title?: string) => string> = {
    vidsrc_to: (id, t) => `https://vidsrc.to/embed/${t}/${id}`,
    vidsrc_me: (id, t) => `https://vidsrc.me/embed/${t}/${id}`,
    vidsrc_xyz: (id, t) => `https://vidsrc.xyz/embed/${t}/${id}`,
    vidsrcme_ru: (id, t) => `https://vidsrcme.ru/embed/${t}/${id}`,
    two_embed: (id) => `https://2embed.cc/embed/${id}`,
    multiembed: (id, t) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=0`,
    embedsu: (id, t) => `https://embed.su/embed/${t}/${id}`,
    autoembed: (id, t) => `https://player.autoembed.cc/embed/${t}/${id}`,
    smashystream: (id, t) => `https://player.smashy.stream/${t}/${id}`,
    miruro: (id, t, title) => `https://www.miruro.ru/search?query=${encodeURIComponent(title || "")}`,
  };

  // Map of TMDB-based sources (key → url builder fn using TMDB ID)
  const tmdbSourceBuilders: Record<string, (tmdbId: string, mediaType: string, title?: string) => string> = {
    cineby: (id, t) => `https://www.cineby.at/${t}/${id}`,
    bflix: (id, t) => `https://bflixs.us/${t}/${id}`,
  };

  useEffect(() => {
    if (session?.watchLink) {
      // Check Google Drive link
      if (session.watchLink.includes("drive.google.com")) {
        setActiveSource("gdrive");
        return;
      }
      // Check IMDB-based sources
      const knownImdb = Object.entries(altSourceBuilders).find(([, builder]) => {
        const testUrl = builder("tt0000000", "movie");
        const domain = new URL(testUrl).hostname;
        return session.watchLink?.includes(domain);
      });
      if (knownImdb) {
        setActiveSource(knownImdb[0]);
        return;
      }
      // Check TMDB-based sources
      const knownTmdb = Object.entries(tmdbSourceBuilders).find(([, builder]) => {
        const testUrl = builder("0", "movie");
        const domain = new URL(testUrl).hostname;
        return session.watchLink?.includes(domain);
      });
      setActiveSource(knownTmdb ? knownTmdb[0] : "default");
    }
  }, [session?.watchLink]);

  const handleSourceChange = async (sourceKey: string) => {
    if (!session || !socket || !user) return;
    setActiveSource(sourceKey);

    const titleEnc = encodeURIComponent(session.movieTitle || "");
    const mediaType = session.movieType === "movie" ? "movie" : "tv";
    let targetLink = "";

    if (sourceKey === "cineby") targetLink = `https://www.cineby.at/${mediaType}/${titleEnc}`;
    else if (sourceKey === "bflix") targetLink = `https://bflixs.us/${mediaType}/${titleEnc}`;
    else if (sourceKey === "miruro") targetLink = `https://www.miruro.ru/search?query=${titleEnc}`;
    else if (sourceKey === "vidsrc_to") targetLink = `https://vidsrc.to/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "vidsrc_me") targetLink = `https://vidsrc.me/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "vidsrcme_ru") targetLink = `https://vidsrcme.ru/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "vidsrc_xyz") targetLink = `https://vidsrc.xyz/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "two_embed") targetLink = `https://2embed.cc/embed/${titleEnc}`;
    else if (sourceKey === "multiembed") targetLink = `https://multiembed.mov/directstream.php?video_id=${titleEnc}&tmdb=0`;
    else if (sourceKey === "embedsu") targetLink = `https://embed.su/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "autoembed") targetLink = `https://player.autoembed.cc/embed/${mediaType}/${titleEnc}`;
    else if (sourceKey === "smashystream") targetLink = `https://player.smashy.stream/${mediaType}/${titleEnc}`;
    else targetLink = `https://1hd.art/search?keyword=${titleEnc}`;

    const relId = getRelationshipId(user.relationshipId);
    if (session.showStarted) {
      socket.emit("cinema_change_source", {
        relationshipId: relId,
        watchLink: targetLink,
        sourceKey,
      });
    } else {
      socket.emit("cinema_select_movie", {
        relationshipId: relId,
        movieId: session.movieId,
        movieTitle: session.movieTitle,
        movieType: session.movieType,
        watchLink: targetLink,
      });
    }
    setSession((prev) => (prev ? { ...prev, watchLink: targetLink } : prev));
    playSound("chime");
    showActionToast(`Switched source to ${sourceKey}`, "🌟");
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
    // Clean up localFile if the watchLink changes away from local
    if (!session || session.watchLink !== "local") {
      setLocalFile(null);
    }
  }, [session?.movieId, session?.watchLink]);

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

    socket.on("cinema_state_changed", (data: { status: "playing" | "paused"; currentTime: number; userId: string }) => {
      if (data.userId === user?._id) return;
      
      const video = videoRef.current;
      if (!video) return;

      isRespondingToSocketRef.current = true;

      const partnerName = "Partner";
      const formattedTime = formatTime(data.currentTime);

      if (Math.abs(video.currentTime - data.currentTime) > 1.5) {
        video.currentTime = data.currentTime;
        playSound("seek");
        showActionToast(`${partnerName} skipped to ${formattedTime}`, "⏩");
      }

      if (data.status === "playing") {
        video.play().catch(() => {});
        playSound("play");
        showActionToast(`${partnerName} resumed playback`, "▶️");
      } else {
        video.pause();
        playSound("pause");
        showActionToast(`${partnerName} paused the movie`, "⏸️");
      }

      setTimeout(() => {
        isRespondingToSocketRef.current = false;
      }, 500);
    });

    socket.on("cinema_server_changed", (data: { server: string }) => {
      document.body.setAttribute("data-love-sync-server", data.server);
      playSound("chime");
      showActionToast(`Server switched to ${data.server}`, "🖥️");
    });

    // Listen to source changes from partner (syncs the dropdown)
    socket.on("cinema_source_changed", (data: { sourceKey: string; watchLink: string }) => {
      setActiveSource(data.sourceKey);
      playSound("chime");
      showActionToast("Stream source updated", "🎬");
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
    socket.on("cinema_chat_received", (msg: { text: string; senderName: string; createdAt: string; type?: "text" | "sticker" }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: msg.senderName,
          text: msg.text,
          isSelf: false,
          createdAt: msg.createdAt,
          type: msg.type || "text",
        },
      ]);
      if (chatSoundEnabled) playSound("notification");
      setIsPartnerTyping(false);

      // Increment unread count if chat drawer is closed
      if (!chatOpen) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    // Listen to typing indicator
    socket.on("cinema_typing_status", (data: { isTyping: boolean }) => {
      setIsPartnerTyping(data.isTyping);
      // Auto-clear typing after 4s if no stop event received
      if (data.isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 4000);
      }
    });

    // Listen to emoji reactions
    socket.on("cinema_reaction_received", (data: { emoji: string }) => {
      triggerReaction(data.emoji, 1);
      playSound("pop");
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

    // Listen to synced subtitles/audio
    socket.on("cinema_language_synced", (data: { subtitleLang: string; audioLang: string }) => {
      setSubtitleLang(data.subtitleLang);
      setAudioLang(data.audioLang);
      playSound("chime");
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
      socket.off("cinema_source_changed");
      socket.off("partner_joined_cinema");
      socket.off("partner_left_cinema");
      socket.off("cinema_chat_received");
      socket.off("cinema_typing_status");
      socket.off("cinema_reaction_received");
      socket.off("cinema_popcorn_thrown");
      socket.off("cinema_cuddle_received");
      socket.off("cinema_snacks_synced");
      socket.off("cinema_language_synced");
      socket.off("cinema_show_started");
      socket.emit("leave_cinema", { relationshipId: relId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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

  // Reaction Animation Generators — Smooth 60FPS Floating Emojis
  const triggerReaction = useCallback((emoji: string, count = 1) => {
    if (!chatSoundEnabled && isPartnerPresent) {
      playSound("pop");
    }
    const newParticles = Array.from({ length: count }).map(() => ({
      emoji,
      x: 15 + Math.random() * 70,
      y: 105,
      opacity: 1,
      vy: -(0.12 + Math.random() * 0.18),
      scale: 0.8 + Math.random() * 0.35,
      swayOffset: Math.random() * 100
    }));
    
    particlesRef.current = [...particlesRef.current, ...newParticles].slice(-35);
    
    if (!animationFrameRef.current) {
      let lastTime = performance.now();

      const animate = (currentTime: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        
        const delta = Math.min((currentTime - lastTime) / 16.67, 2);
        lastTime = currentTime;

        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
          canvas.width = Math.floor(rect.width) || window.innerWidth;
          canvas.height = Math.floor(rect.height) || window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeParticles = false;
        
        particlesRef.current.forEach(p => {
          if (p.opacity > 0) {
            activeParticles = true;
            p.y += p.vy * delta;
            p.x += Math.sin((currentTime / 400) + (p.swayOffset || 0)) * 0.05 * delta;
            p.opacity -= 0.0025 * delta;
            
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.font = `${Math.floor(p.scale * 26)}px sans-serif`;
            ctx.fillText(p.emoji, (p.x / 100) * canvas.width, (p.y / 100) * canvas.height);
          }
        });
        
        particlesRef.current = particlesRef.current.filter(p => p.opacity > 0);
        
        if (activeParticles) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [chatSoundEnabled, isPartnerPresent, playSound]);

  const triggerPopcornFight = useCallback(() => {
    triggerReaction('🍿', 16);
  }, [triggerReaction]);

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
      senderName: user.name || "Partner",
    });
  };

  const handleToggleReady = () => {
    if (!socket || !user || !user.relationshipId || !session) return;
    const relId = getRelationshipId(user.relationshipId);
    const isReady = session.readyUsers?.includes(user._id) || false;
    socket.emit("cinema_ready_toggle", { relationshipId: relId, ready: !isReady });
    playSound("tap");
  };

  const handleSearchMiruroDirect = (queryTitle: string) => {
    if (!socket || !user || !user.relationshipId || !queryTitle.trim()) return;
    const relId = getRelationshipId(user.relationshipId);
    const title = queryTitle.trim();
    const searchUrl = `https://www.miruro.ru/search?query=${encodeURIComponent(title)}`;

    socket.emit("cinema_select_movie", {
      relationshipId: relId,
      movieId: `miruro-${Date.now()}`,
      movieTitle: title,
      movieType: "anime",
      watchLink: searchUrl,
    });
    setActiveSource("miruro");
    playSound("chime");
    showActionToast(`Searching "${title}" on Miruro`, "🌸");
  };

  const handleLoadMovie = async (movie: any) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    let link = movie.watchLink || "";

    const isAnime = await isAnimeTitleAsync(movie.title, movie.type, movie.genre, movie.category);

    // If title is an Anime or lacks direct link, default/first search on Miruro
    if (isAnime || (!link && movie.title)) {
      link = `https://www.miruro.ru/search?query=${encodeURIComponent(movie.title || "")}`;
      setActiveSource("miruro");
    }

    // If watchlist movie contains a Google Drive link, parse it and set correct ID prefix
    if (link.includes("drive.google.com")) {
      const fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      if (fileId) {
        link = `https://drive.google.com/file/d/${fileId}/preview`;
        socket.emit("cinema_select_movie", {
          relationshipId: relId,
          movieId: `gdrive-${fileId}`,
          movieTitle: movie.title,
          movieType: movie.type,
          watchLink: link,
        });
        playSound("chime");
        return;
      }
    }

    socket.emit("cinema_select_movie", {
      relationshipId: relId,
      movieId: movie._id,
      movieTitle: movie.title,
      movieType: movie.type || (isAnime ? "anime" : "movie"),
      watchLink: link,
    });
    if (isAnime) setActiveSource("miruro");
    playSound("chime");
  };

  const handleLoadGDriveLink = (link: string, customTitle?: string) => {
    if (!socket || !user || !user.relationshipId || !link) return;
    const relId = getRelationshipId(user.relationshipId);

    // If it is a Google Drive link, extract file ID and format to preview
    if (link.includes("drive.google.com")) {
      const fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      if (!fileId) {
        setSourceError("Invalid Google Drive link format. Make sure it contains '/file/d/FILE_ID'.");
        setTimeout(() => setSourceError(null), 5000);
        return;
      }

      const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      const title = customTitle?.trim() || "Shared Google Drive Video";

      socket.emit("cinema_select_movie", {
        relationshipId: relId,
        movieId: `gdrive-${fileId}`,
        movieTitle: title,
        movieType: "movie",
        watchLink: embedUrl,
      });
    } else {
      // If it is any other URL, load it directly as a custom stream
      const title = customTitle?.trim() || link.split("/").pop()?.split("?")[0] || "Custom Stream";
      
      socket.emit("cinema_select_movie", {
        relationshipId: relId,
        movieId: `custom-${Date.now()}`,
        movieTitle: decodeURIComponent(title),
        movieType: "movie",
        watchLink: link.trim(),
      });
    }

    playSound("chime");
    setGdriveLink("");
    setGdriveTitle("");
    setActiveSource("gdrive");
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

  const handleLanguageSync = (sub: string, aud: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_sync_language", {
      relationshipId: relId,
      subtitleLang: sub,
      audioLang: aud,
    });
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
      type: "text",
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socket.emit("cinema_chat", {
      relationshipId: relId,
      text: chatInput,
      senderName: user.name.split(" ")[0],
      type: "text",
    });

    // Stop typing indicator
    socket.emit("cinema_typing", { relationshipId: relId, isTyping: false });
    setChatInput("");
    setStickerPickerOpen(false);
    playSound("tap");
  };

  const handleSendSticker = (stickerText: string) => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderName: user.name.split(" ")[0],
      text: stickerText,
      isSelf: true,
      createdAt: new Date().toISOString(),
      type: "sticker",
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socket.emit("cinema_chat", {
      relationshipId: relId,
      text: stickerText,
      senderName: user.name.split(" ")[0],
      type: "sticker",
    });

    setStickerPickerOpen(false);
    playSound("pop");
  };

  const handleChatTyping = () => {
    if (!socket || !user || !user.relationshipId) return;
    const relId = getRelationshipId(user.relationshipId);
    socket.emit("cinema_typing", { relationshipId: relId, isTyping: true });
  };

  // Relative time formatter for chat timestamps
  const getRelativeTime = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 10) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    // Direct event listener props to sync HTML5 video elements without extension dependencies
    const syncVideoProps = {
      ref: videoRef,
      onPlay: () => {
        if (isRespondingToSocketRef.current || !socket) return;
        const relId = getRelationshipId(user?.relationshipId || "");
        socket.emit("cinema_state_change", {
          relationshipId: relId,
          status: "playing",
          currentTime: videoRef.current?.currentTime || 0,
        });
        playSound("play");
        showActionToast("Resumed playback", "▶️");
      },
      onPause: () => {
        if (isRespondingToSocketRef.current || !socket) return;
        const relId = getRelationshipId(user?.relationshipId || "");
        socket.emit("cinema_state_change", {
          relationshipId: relId,
          status: "paused",
          currentTime: videoRef.current?.currentTime || 0,
        });
        playSound("pause");
        showActionToast("Paused playback", "⏸️");
      },
      onSeeked: () => {
        if (isRespondingToSocketRef.current || !socket) return;
        const relId = getRelationshipId(user?.relationshipId || "");
        socket.emit("cinema_state_change", {
          relationshipId: relId,
          status: videoRef.current?.paused ? "paused" : "playing",
          currentTime: videoRef.current?.currentTime || 0,
        });
        playSound("seek");
        const formattedTime = formatTime(videoRef.current?.currentTime || 0);
        showActionToast(`Skipped to ${formattedTime}`, "⏩");
      },
      onVolumeChange: (e: any) => {
        setVideoMuted(e.currentTarget.muted);
      },
    };

    // If it is a local file co-watching session
    if (session.watchLink === "local") {
      if (localFile) {
        return (
          <video
            src={localFileUrl}
            {...syncVideoProps}
            muted={videoMuted}
            className={cn(
              "w-full h-full border border-white/5 shadow-2xl bg-black transition-all",
              videoFitMode === "cover" ? "object-cover" : videoFitMode === "fill" ? "object-fill" : "object-contain"
            )}
            controls
            autoPlay
            playsInline
          />
        );
      } else {
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#05050f] z-20">
            <div className="cinema-projector mb-6 relative">
              <Film className="w-8 h-8 text-[#E8587A]" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-serif tracking-wider mb-2">
              Syncing Local Video Playback
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              Your partner loaded <span className="text-[#E8587A] font-extrabold">{session.movieTitle}</span>.
              To watch together in 100% sync and original quality, select or drop your copy of this file below!
            </p>
            <label className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2">
              <span>Select Video File</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setLocalFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        );
      }
    }

    // If it is a direct video file link (ends with .mp4/.webm or contains them)
    const isDirectVideo = session.watchLink.endsWith(".mp4") || 
                          session.watchLink.endsWith(".webm") ||
                          session.watchLink.includes(".mp4?") || 
                          session.watchLink.includes(".webm?") ||
                          (session.watchLink.includes(".loca.lt/") && session.watchLink.includes(".mp4"));

    if (isDirectVideo) {
      return (
        <video
          src={session.watchLink}
          {...syncVideoProps}
          muted={videoMuted}
          className={cn(
            "w-full h-full border border-white/5 shadow-2xl bg-black transition-all",
            videoFitMode === "cover" ? "object-cover" : videoFitMode === "fill" ? "object-fill" : "object-contain"
          )}
          controls
          autoPlay
          playsInline
        />
      );
    }

    // If it is a Google Drive video and we have forced HTML5 Direct Stream mode
    if (session.movieId?.startsWith("gdrive-") && gdrivePlayerMode === "html5") {
      const fileId = session.movieId.replace("gdrive-", "");
      const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return (
        <video
          src={directUrl}
          {...syncVideoProps}
          muted={videoMuted}
          className={cn(
            "w-full h-full border border-white/5 shadow-2xl bg-black transition-all",
            videoFitMode === "cover" ? "object-cover" : videoFitMode === "fill" ? "object-fill" : "object-contain"
          )}
          controls
          autoPlay
          playsInline
        />
      );
    }

    return (
      <iframe
        key={session.watchLink}
        src={session.watchLink}
        className="w-full h-full border-0 animate-fade-in"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }, [session?.watchLink, session?.movieId, session?.movieTitle, gdrivePlayerMode, localFile, localFileUrl, videoMuted, videoFitMode]);

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
        <div className="cinema-star-field" />
      </div>
    );
  }

  const isSelfReady = session.readyUsers?.includes(user?._id || "") || false;
  const readyCount = session.readyUsers?.length || 0;
  const reactions = ["❤️", "😂", "😢", "😱", "🍿", "🎉"];

  return (
    <div className="relative w-full h-screen overflow-hidden cinema-page cinema-root flex select-none bg-[#05050f]">
      {/* Star Field Background */}
      <div className="cinema-star-field" />
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
      {/* Cinema Action Toast Banner Overlay */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="cinema-action-toast"
          >
            <span>{actionToast.icon}</span>
            <span>{actionToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Particles Layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[55]">
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[55]" style={{width:'100%',height:'100%'}} />
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
          (chatOpen && session?.showStarted) ? "sm:mr-[360px] mr-0" : "mr-0"
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
                <p className="text-xs text-zinc-500 mt-1">
                  Select a movie from your shared list to watch together
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                  <Users className="w-4 h-4 text-[#E8587A]" />
                  <span className="text-xs font-bold text-zinc-300">
                    {isPartnerPresent
                      ? "Partner in Lobby"
                      : "Waiting for partner..."}
                  </span>
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isPartnerPresent ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-zinc-650"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Direct Source Options: Google Drive & Local Files */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Google Drive Link co-watching section */}
              <div className="p-6 rounded-3xl cinema-glass-panel border border-white/5 shadow-2xl relative flex flex-col justify-between gap-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8587A]/5 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8587A]/10 flex items-center justify-center text-[#E8587A]">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-serif tracking-wide">
                      Watch via Google Drive Link
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Paste any shared Google Drive video link to watch it in real-time sync with your partner
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <input
                    type="text"
                    placeholder="Enter Title (optional)"
                    value={gdriveTitle}
                    onChange={(e) => setGdriveTitle(e.target.value)}
                    className="px-4 py-3 rounded-2xl text-xs bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8587A]/30 transition-all sm:w-1/3"
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="https://drive.google.com/file/d/FILE_ID/view"
                      value={gdriveLink}
                      onChange={(e) => setGdriveLink(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl text-xs bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8587A]/30 transition-all"
                    />
                    <button
                      onClick={() => handleLoadGDriveLink(gdriveLink, gdriveTitle)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2 flex-shrink-0"
                    >
                      <span>Load</span>
                      <Play className="w-3 h-3 fill-white stroke-none" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Local File synced co-watching section */}
              <div className="p-6 rounded-3xl cinema-glass-panel border border-white/5 shadow-2xl relative flex flex-col justify-between gap-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A574]/5 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#D4A574]/10 flex items-center justify-center text-[#D4A574]">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-serif tracking-wide">
                      Watch a Local File (Zero Buffering)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Play a video file (MP4/MKV) from your PC. Partner loads their copy of the file for 100% sync!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full">
                  <label className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4A574] to-[#E8587A] text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2 flex-shrink-0">
                    <span>Choose Video File</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setLocalFile(file);
                          if (socket && user && user.relationshipId) {
                            const relId = getRelationshipId(user.relationshipId);
                            socket.emit("cinema_select_movie", {
                              relationshipId: relId,
                              movieId: `local-${Date.now()}`,
                              movieTitle: file.name,
                              movieType: "movie",
                              watchLink: "local",
                            });
                          }
                        }
                      }}
                    />
                  </label>
                  {localFile ? (
                    <span className="text-xs text-zinc-400 truncate max-w-[200px]" title={localFile.name}>
                      "Selected": {localFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">
                      "No file chosen"
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies, anime & TV shows..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-[#E8587A]/30 transition-all"
                  />
                </div>

                <div className="flex bg-zinc-900/60 border border-white/10 rounded-2xl p-1.5 self-start sm:self-auto shadow-inner">
                  <button
                    onClick={() => setActiveFilter("watchlist")}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all",
                      activeFilter === "watchlist"
                        ? "bg-[#E8587A] text-white shadow-lg shadow-[#E8587A]/15"
                        : "text-zinc-500 hover:text-zinc-350"
                    )}
                  >
                    "Watchlist"
                  </button>
                  <button
                    onClick={() => setActiveFilter("watched")}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all",
                      activeFilter === "watched"
                        ? "bg-[#E8587A] text-white shadow-lg shadow-[#E8587A]/15"
                        : "text-zinc-500 hover:text-zinc-355"
                    )}
                  >
                    "Watched History"
                  </button>
                </div>
              </div>

              {/* Quick Miruro Anime Search Bar Trigger */}
              {searchQuery.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-transparent border border-rose-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🌸</span>
                    <span className="text-xs font-bold text-zinc-200">
                      Search <span className="text-[#E8587A]">"{searchQuery.trim()}"</span> on Miruro Anime Engine
                    </span>
                  </div>
                  <button
                    onClick={() => handleSearchMiruroDirect(searchQuery)}
                    className="px-4 py-1.5 rounded-lg bg-[#E8587A] hover:bg-[#BE3A6E] text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Search on Miruro ↗
                  </button>
                </motion.div>
              )}
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
                      <p className="text-base font-bold text-zinc-400">No lobby titles match "{searchQuery}"</p>
                      {searchQuery.trim() && (
                        <button
                          onClick={() => handleSearchMiruroDirect(searchQuery)}
                          className="mt-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white text-xs font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-white/10"
                        >
                          <span>🌸 Search "{searchQuery.trim()}" on Miruro Anime</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((movie) => (
                      <div
                        key={movie._id}
                        className="cinema-lobby-card p-4 flex gap-4 cursor-pointer"
                        onClick={() => handleLoadMovie(movie)}
                      >
                        {/* Left Side: Poster Image or Fallback */}
                        <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 relative bg-zinc-900 shadow-lg border border-white/5">
                          {movie.posterUrl ? (
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-115"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center text-zinc-650 p-2 text-center">
                              <Film className="w-6 h-6 mb-1 text-zinc-700 animate-pulse" />
                              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">No Cover</span>
                            </div>
                          )}
                          
                          {/* Rating Overlay on Poster */}
                          {movie.rating && (
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[#D4A574] text-[9px] font-black">
                              <Star className="w-2.5 h-2.5 fill-[#D4A574] stroke-none" />
                              <span>{movie.rating}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Details & Load Action */}
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#D4A574] bg-[#D4A574]/10 px-2 py-0.5 rounded">
                                {movie.type}
                              </span>
                              <span className="text-[9px] font-semibold text-zinc-500">
                                {movie.watchLink ? "Available" : "Sync Only"}
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-white tracking-wide mt-2 line-clamp-2 leading-snug font-serif">
                              {movie.title}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1">
                              {movie.watchLink ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                                  <span className="text-zinc-400">Stream Ready</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                  <span className="text-zinc-500">Remote Only</span>
                                </>
                              )}
                            </span>
                            <button className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-[#E8587A] text-white text-[10px] font-bold transition-all cursor-pointer hover:shadow-lg hover:shadow-[#E8587A]/25 active:scale-95">
                              Load 🎬
                            </button>
                          </div>
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
                <span>"Choose Different Movie"</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400">
                <Users className="w-4 h-4 text-[#E8587A]" />
                <span className="text-xs font-bold">
                  {isPartnerPresent
                    ? ("Partner in Hall")
                    : ("Waiting for partner...")}
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
                  <span className="text-xs font-extrabold text-zinc-400">
                    You
                  </span>
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
                  <span className="text-xs font-extrabold text-zinc-400">
                    Partner
                  </span>
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
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                  Configure Date Snacks
                </h4>
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
                 "cinema-bar-transition absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-40",
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
                {isPartnerPresent ? (
                  <div className="hidden sm:flex cinema-live-badge items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8587A]/10 border border-[#E8587A]/20 text-xs text-[#E8587A] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#E8587A] animate-pulse shadow-[0_0_8px_#E8587A]" />
                    <span>LIVE</span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>Solo Viewing</span>
                  </div>
                )}

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
                  <span className="hidden xs:inline">
                    {isExtensionActive ? "Active" : "Sync Offline"}
                  </span>
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

              {/* Cineby / External Site Cross-Origin Helper Overlay */}
              {session.watchLink?.includes("cineby.at") && (
                <div className="absolute top-20 left-6 z-40 bg-black/85 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex items-center gap-3 shadow-2xl animate-fade-in max-w-md">
                  <div className="text-xl">🌟</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-white font-serif">Cineby Streaming Mode</span>
                    <span className="text-[10px] text-zinc-400">If browser blocks embedded frame, open in new tab or switch provider</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <a
                      href={session.watchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#E8587A] text-white text-[10px] font-extrabold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                    >
                      Open Cineby ↗
                    </a>
                    <button
                      onClick={() => handleSourceChange("default")}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold transition-all active:scale-95"
                    >
                      Switch to 1HD 🎬
                    </button>
                  </div>
                </div>
              )}

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
                "cinema-bar-transition cinema-control-glow absolute bottom-6 left-1/2 -translate-x-1/2 cinema-glass-panel p-2 flex items-center justify-center gap-3.5 z-40 max-w-[95%] w-[260px]",
                !controlsVisible && "cinema-bar-hidden cinema-controls-hidden"
              )}
            >
              {/* 1. Audio Mute Toggle */}
              <button
                onClick={() => setVideoMuted(prev => !prev)}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border",
                  videoMuted
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-450 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
                title={videoMuted ? "Unmute audio" : "Mute audio"}
              >
                {videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* 3. Screen Fill / Aspect Ratio Toggle */}
              <button
                onClick={handleToggleAspectMode}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border",
                  videoFitMode !== "contain"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
                title={`Aspect Mode: ${videoFitMode === "cover" ? "Cover (Full Screen Fill)" : videoFitMode === "fill" ? "Fill (Stretch)" : "Fit (Original 16:9)"}`}
              >
                <Maximize className="w-4 h-4" />
              </button>

              {/* 4. Settings Sidebar Tab Toggle */}
              <button
                onClick={() => {
                  if (chatOpen && sidebarTab === "settings") {
                    setChatOpen(false);
                  } else {
                    setChatOpen(true);
                    setSidebarTab("settings");
                  }
                  playSound("tap");
                }}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border",
                  (chatOpen && sidebarTab === "settings")
                    ? "bg-zinc-800 border-white/15 text-white"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
                title="Theater Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* 4. Chat Sidebar Tab Toggle */}
              <button
                onClick={() => {
                  if (chatOpen && sidebarTab === "chat") {
                    setChatOpen(false);
                  } else {
                    setChatOpen(true);
                    setSidebarTab("chat");
                  }
                  playSound("tap");
                }}
                className={cn(
                  "w-9 h-9 rounded-xl relative flex items-center justify-center transition-all cursor-pointer active:scale-95 border",
                  (chatOpen && sidebarTab === "chat")
                    ? "bg-[#E8587A]/20 border-[#E8587A]/40 text-[#E8587A]"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
                title="Theater Chat"
              >
                <MessageSquare className="w-4 h-4" />
                {(!chatOpen || sidebarTab !== "chat") && unreadChatCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#E8587A] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          SIDEBAR CHAT DRAWER PANEL (Slides in from right)
          ======================================================== */}
      <div className={cn("cinema-chat-drawer flex flex-col", (chatOpen && session?.showStarted) && "open")}>
        {/* Mobile Swipe Handle bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Chat Drawer Header — Premium Gradient */}
        <div className="cinema-chat-header p-4 pt-2 sm:pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8587A]/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#E8587A]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-serif tracking-wide">
                {sidebarTab === "chat" ? "Theater Chat" : "Settings"}
              </h3>
              {isPartnerPresent && (
                <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Partner online
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {sidebarTab === "chat" && (
              /* Chat Sound Toggle */
              <button
                onClick={() => setChatSoundEnabled(!chatSoundEnabled)}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  chatSoundEnabled ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-rose-400 bg-rose-500/10"
                )}
                title={chatSoundEnabled ? "Mute chat sounds" : "Unmute chat sounds"}
              >
                {chatSoundEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => { setChatOpen(false); setStickerPickerOpen(false); }}
              className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="cinema-tab-switcher">
          <button
            onClick={() => { setSidebarTab("chat"); playSound("tap"); }}
            className={cn(
              "cinema-tab",
              sidebarTab === "chat" && "active-chat"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => { setSidebarTab("settings"); playSound("tap"); }}
            className={cn(
              "cinema-tab",
              sidebarTab === "settings" && "active-settings"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {sidebarTab === "chat" ? (
          <>
            {/* Chat Messages Log Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 cinema-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="my-auto flex flex-col items-center text-center p-6 cinema-fade-in">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8587A]/10 to-[#D4A574]/10 flex items-center justify-center mb-4 border border-white/5">
                    <Heart className="w-7 h-7 text-[#E8587A] animate-pulse" />
                  </div>
                  <p className="text-sm font-extrabold text-zinc-300 font-serif">Whisper something sweet...</p>
                  <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px] leading-relaxed">
                    Your movie date chat — share reactions, send stickers, and whisper sweet nothings 💕
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                    className={cn(
                      "flex flex-col max-w-[92%] w-fit gap-0.5",
                      msg.isSelf ? "self-end items-end" : "self-start items-start"
                    )}
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[9px] font-bold text-zinc-500">{msg.senderName}</span>
                      <span className="text-[8px] text-zinc-700 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {getRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    {msg.type === "sticker" ? (
                      <div className="cinema-msg-sticker px-2 py-1">
                        <span className={cn(
                          "block",
                          msg.text.length <= 4 ? "text-5xl" : "text-2xl font-medium"
                        )}>
                          {msg.text}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "cinema-msg-bubble p-3 rounded-2xl text-xs leading-relaxed break-words",
                          msg.isSelf
                            ? "cinema-msg-self rounded-tr-sm"
                            : "cinema-msg-partner rounded-tl-sm"
                        )}
                      >
                        {msg.text}
                      </div>
                    )}
                  </motion.div>
                ))
              )}

              {/* Typing Indicator */}
              {isPartnerTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="self-start flex items-center gap-2 px-1"
                >
                  <div className="cinema-typing-indicator">
                    <span /><span /><span />
                  </div>
                  <span className="text-[9px] text-zinc-500 font-medium italic">
                    "typing..."
                  </span>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>
            {/* Sticker Picker Panel */}
            <AnimatePresence>
              {stickerPickerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 280, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="cinema-sticker-picker overflow-hidden border-t border-white/5 shrink-0"
                >
                  {/* Sticker Pack Tabs */}
                  <div className="flex items-center gap-1 p-2 border-b border-white/5 overflow-x-auto cinema-scrollbar">
                    {Object.entries(stickerPacks).map(([key, pack]) => (
                      <button
                        key={key}
                        onClick={() => setActiveStickerPack(key)}
                        className={cn(
                          "cinema-sticker-pack-tab px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all",
                          activeStickerPack === key
                            ? "bg-[#E8587A]/15 text-[#E8587A] border border-[#E8587A]/25"
                            : "text-zinc-500 hover:text-zinc-350 hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <span className="mr-1">{pack.icon}</span>
                        {pack.label}
                      </button>
                    ))}
                  </div>

                  {/* Sticker Grid */}
                  <div className="flex-1 overflow-y-auto p-3 cinema-scrollbar" style={{ maxHeight: 230 }}>
                    <div className="grid grid-cols-5 gap-2">
                      {stickerPacks[activeStickerPack]?.stickers.map((sticker, i) => (
                        <button
                          key={`${activeStickerPack}-${i}`}
                          onClick={() => handleSendSticker(sticker)}
                          className="cinema-sticker-item flex items-center justify-center rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-[#E8587A]/20 cursor-pointer transition-all active:scale-90"
                          style={{ aspectRatio: "1" }}
                          title={sticker}
                        >
                          <span className={cn(
                            sticker.length <= 4 ? "text-2xl" : "text-xs font-medium text-zinc-300"
                          )}>
                            {sticker}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Date Triggers & Quick Emojis inside Chat */}
            <div className="flex flex-col border-t border-white/5 bg-black/20 shrink-0">
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase text-zinc-500 tracking-wider">Date Actions</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleThrowPopcorn}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-bold border border-white/5 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <span>🍿 "Fight"</span>
                  </button>
                  <button
                    onClick={handleSendCuddle}
                    className="px-2 py-0.5 rounded-lg bg-[#E8587A]/15 hover:bg-[#E8587A]/25 text-[#E8587A] text-[10px] font-bold border border-[#E8587A]/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <span>🤗 "Cuddle"</span>
                  </button>
                </div>
              </div>
              <div className="cinema-emoji-row flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-base transition-all cursor-pointer active:scale-90 shrink-0"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Send Form — Enhanced */}
            <form onSubmit={handleSendChat} className="cinema-chat-input-wrap flex flex-col gap-2 shrink-0">
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setStickerPickerOpen(!stickerPickerOpen)}
                  className={cn(
                    "cinema-sticker-toggle",
                    stickerPickerOpen && "open"
                  )}
                  title="Open sticker picker"
                >
                  <Sticker className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    handleChatTyping();
                  }}
                  placeholder="Type a message..."
                  className="cinema-chat-input"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={cn(
                    "cinema-send-btn",
                    chatInput.trim() ? "ready" : "disabled"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Settings Tab Content */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 cinema-scrollbar">
            {/* Quick Actions Card */}
            <div className="cinema-settings-card">
              <span className="cinema-settings-label">Quick Actions</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVideoMuted(prev => !prev)}
                  className={cn(
                    "cinema-action-btn",
                    videoMuted && "active"
                  )}
                  style={videoMuted ? { background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171', boxShadow: '0 0 20px rgba(239, 68, 68, 0.08)' } as React.CSSProperties : undefined}
                >
                  {videoMuted ? <VolumeX className="action-icon w-5 h-5" /> : <Volume2 className="action-icon w-5 h-5" />}
                  <span>{videoMuted ? "Unmute Audio" : "Mute Audio"}</span>
                </button>
                <button
                  onClick={handleToggleAspectMode}
                  className={cn(
                    "cinema-action-btn",
                    videoFitMode !== "contain" && "active"
                  )}
                  style={videoFitMode !== "contain" ? { background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#34d399', boxShadow: '0 0 20px rgba(16, 185, 129, 0.08)' } as React.CSSProperties : undefined}
                >
                  <Maximize className="action-icon w-5 h-5" />
                  <span>{videoFitMode === "cover" ? "Fill Screen" : videoFitMode === "fill" ? "Stretch" : "Fit 16:9"}</span>
                </button>
              </div>
            </div>

            {/* ═══ Cinema Sync Controls (from Extension) ═══ */}
            {isExtensionActive && detectedControls && (() => {
              const totalControls = (detectedControls.servers?.length || 0) + (detectedControls.languages?.length || 0) + (detectedControls.episodes?.length || 0) + (detectedControls.quality?.length || 0);
              if (totalControls === 0) return null;
              return (
                <div className="cinema-settings-card" style={{ borderColor: 'rgba(16, 185, 129, 0.12)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Cinema Sync Controls</span>
                    </div>
                    <button
                      onClick={requestControlRescan}
                      className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Rescan page for controls"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rescan</span>
                    </button>
                  </div>
                  {detectedControls.servers.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">"\uD83D\uDDA5" Servers</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedControls.servers.map((ctrl) => (
                          <button key={`srv-${ctrl.index}`} onClick={() => sendControlClick("servers", ctrl.index)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95", ctrl.active ? "bg-[#E8587A]/15 border-[#E8587A]/40 text-[#E8587A] shadow-[0_0_8px_rgba(232,88,122,0.15)]" : "bg-white/[0.03] border-white/8 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200")}>
                            {ctrl.active && <span className="mr-1 text-[7px]">●</span>}{ctrl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {detectedControls.languages.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">"\uD83C\uDF10" Audio</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedControls.languages.map((ctrl) => (
                          <button key={`lang-${ctrl.index}`} onClick={() => sendControlClick("languages", ctrl.index)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95", ctrl.active ? "bg-[#E8587A]/15 border-[#E8587A]/40 text-[#E8587A] shadow-[0_0_8px_rgba(232,88,122,0.15)]" : "bg-white/[0.03] border-white/8 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200")}>
                            {ctrl.active && <span className="mr-1 text-[7px]">●</span>}{ctrl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {detectedControls.episodes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">"\uD83D\uDCFA" Episodes</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto cinema-scrollbar">
                        {detectedControls.episodes.map((ctrl) => (
                          <button key={`ep-${ctrl.index}`} onClick={() => sendControlClick("episodes", ctrl.index)} className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95", ctrl.active ? "bg-[#E8587A]/15 border-[#E8587A]/40 text-[#E8587A] shadow-[0_0_8px_rgba(232,88,122,0.15)]" : "bg-white/[0.03] border-white/8 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200")}>
                            {ctrl.active && <span className="mr-1 text-[7px]">●</span>}{ctrl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {detectedControls.quality.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">"\u2699" Quality</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedControls.quality.map((ctrl) => (
                          <button key={`q-${ctrl.index}`} onClick={() => sendControlClick("quality", ctrl.index)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95", ctrl.active ? "bg-[#E8587A]/15 border-[#E8587A]/40 text-[#E8587A] shadow-[0_0_8px_rgba(232,88,122,0.15)]" : "bg-white/[0.03] border-white/8 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200")}>
                            {ctrl.active && <span className="mr-1 text-[7px]">●</span>}{ctrl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Streaming Config Group */}
            <div className="cinema-settings-card">
              <span className="cinema-settings-label">Streaming Server & Source</span>

              {/* Source selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-500">Stream Provider</label>
                {STREAM_SOURCES.length > 0 && (
                  <select
                    value={activeSource}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="cinema-select"
                  >
                    {STREAM_SOURCES.map(s => (<option key={s.key} value={s.key}>{s.emoji} {s.label}</option>))}
                  </select>
                )}
              </div>

              {/* Server selector (Only if default 1HD active) */}
              {activeSource === "default" && !session?.movieId?.startsWith("gdrive-") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500">Mirror Server</label>
                  <select
                    value={session.activeServer || "upcloud"}
                    onChange={(e) => handleServerChange(e.target.value)}
                    className="cinema-select"
                  >
                    <option value="upcloud">UpCloud</option>
                    <option value="vidmoly">Vidmoly</option>
                    <option value="videasy">Videasy</option>
                    <option value="vidcloud">Vidcloud</option>
                    <option value="vidfast">Vidfast</option>
                  </select>
                </div>
              )}

              {/* Subtitles Option */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-500">Subtitles</label>
                <select
                  value={subtitleLang}
                  onChange={(e) => {
                    setSubtitleLang(e.target.value);
                    handleLanguageSync(e.target.value, audioLang);
                    playSound("tap");
                  }}
                  className="cinema-select"
                >
                  <option value="none">None</option>
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="fr">🇫🇷 French</option>
                  <option value="de">🇩🇪 German</option>
                  <option value="hi">🇮🇳 Hindi</option>
                  <option value="ja">🇯🇵 Japanese</option>
                </select>
              </div>

              {/* Audio Track Option */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-500">Audio Track</label>
                <select
                  value={audioLang}
                  onChange={(e) => {
                    setAudioLang(e.target.value);
                    handleLanguageSync(subtitleLang, e.target.value);
                    playSound("tap");
                  }}
                  className="cinema-select"
                >
                  <option value="original">Original</option>
                  <option value="en">🇺🇸 English Dub</option>
                  <option value="es">🇪🇸 Spanish Dub</option>
                  <option value="fr">🇫🇷 French Dub</option>
                  <option value="de">🇩🇪 German Dub</option>
                  <option value="hi">🇮🇳 Hindi Dub</option>
                  <option value="ja">🇯🇵 Japanese Dub</option>
                </select>
              </div>
            </div>

            {/* 100% Reliable Embed Connection Fallback Link */}
            {session.watchLink && (
              <div className="cinema-settings-card" style={{ borderColor: 'rgba(232, 88, 122, 0.15)' }}>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#E8587A] flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-[#E8587A] tracking-wider">Embed Fallback</span>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      If the video fails to load, displays connection errors, or states embedding is blocked:
                    </p>
                  </div>
                </div>
                <a
                  href={session.watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white text-xs font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-white/10 mt-3"
                >
                  <span>Open in New Tab ↗</span>
                </a>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
