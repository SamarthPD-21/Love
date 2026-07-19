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
  Info,
  Link2,
  Play,
  Sticker,
  SmilePlus,
  Clock,
  BellOff,
  Bell
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
  type?: "text" | "sticker";
}

interface FloatingParticle {
  id: string;
  emoji: string;
  left: number;
  delay?: number;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    lobby: "Cinema Lobby",
    exit: "Exit Cinema Hall",
    waiting: "Waiting for partner...",
    partnerLobby: "Partner in Lobby",
    partnerHall: "Partner in Hall",
    chooseDifferent: "Choose Different Movie",
    readyWatch: "I am Ready to Watch 🍿",
    readyWaiting: "Ready! Waiting",
    theaterSetup: "Theater Setup",
    dateSnacks: "Configure Date Snacks",
    syncLocal: "Syncing Local Video Playback",
    gdriveTitle: "Watch via Google Drive Link",
    localTitle: "Watch a Local File (Zero Buffering)",
    searchPlaceholder: "Search movies & TV shows...",
    watchlist: "Watchlist",
    history: "Watched History",
    streamReady: "Stream Ready",
    remoteOnly: "Remote Only",
    coWatching: "Co-Watching",
    soloViewing: "Solo Viewing",
    syncOffline: "Sync Offline",
    active: "Active",
    theaterChat: "Theater Chat",
    typeMessage: "Type a message...",
    whisper: "Whisper something sweet...",
    noMessages: "No messages yet",
    lights: "💡 Lights",
    audio: "🔊 Audio",
    fight: "🍿 Fight",
    cuddle: "🤗 Cuddle",
    stickers: "Stickers",
    openTab: "Open in New Tab",
    tryAgain: "Try Again",
    embedError: "This source doesn't support embedding",
    language: "Language",
    subtitles: "Subtitles",
    audioTrack: "Audio Track"
  },
  es: {
    lobby: "Vestíbulo del Cine",
    exit: "Salir de la Sala de Cine",
    waiting: "Esperando al compañero...",
    partnerLobby: "Compañero en el Vestíbulo",
    partnerHall: "Compañero en la Sala",
    chooseDifferent: "Elegir otra Película",
    readyWatch: "¡Estoy Listo para Ver! 🍿",
    readyWaiting: "¡Listo! Esperando",
    theaterSetup: "Configuración de la Sala",
    dateSnacks: "Configurar Snacks para la Cita",
    syncLocal: "Sincronizando Reproducción Local",
    gdriveTitle: "Ver vía Enlace de Google Drive",
    localTitle: "Ver Archivo Local (Sin Buffering)",
    searchPlaceholder: "Buscar películas y series...",
    watchlist: "Lista de Seguimiento",
    history: "Historial de Visto",
    streamReady: "Transmisión Lista",
    remoteOnly: "Solo Remoto",
    coWatching: "Co-reproducción",
    soloViewing: "Viendo Solo",
    syncOffline: "Sincronización Desconectada",
    active: "Activo",
    theaterChat: "Chat de la Sala",
    typeMessage: "Escribe un mensaje...",
    whisper: "Susurra algo dulce...",
    noMessages: "Sin mensajes aún",
    lights: "💡 Luces",
    audio: "🔊 Audio",
    fight: "🍿 Pelea",
    cuddle: "🤗 Abrazo",
    stickers: "Pegatinas",
    openTab: "Abrir en Nueva Pestaña",
    tryAgain: "Intentar de Nuevo",
    embedError: "Esta fuente no admite incrustación",
    language: "Idioma",
    subtitles: "Subtítulos",
    audioTrack: "Pista de Audio"
  },
  fr: {
    lobby: "Hall du Cinéma",
    exit: "Quitter la Salle de Cinéma",
    waiting: "En attente du partenaire...",
    partnerLobby: "Partenaire dans le Hall",
    partnerHall: "Partenaire dans la Salle",
    chooseDifferent: "Choisir un autre Film",
    readyWatch: "Je suis Prêt à Regarder 🍿",
    readyWaiting: "Prêt ! En attente",
    theaterSetup: "Configuration de la Salle",
    dateSnacks: "Configurer les Snacks",
    syncLocal: "Lecture Vidéo Locale Synchronisée",
    gdriveTitle: "Regarder via Google Drive",
    localTitle: "Regarder un Fichier Local (Sans Buffering)",
    searchPlaceholder: "Rechercher des films et séries...",
    watchlist: "Liste de Suivi",
    history: "Historique",
    streamReady: "Prêt à Diffuser",
    remoteOnly: "À distance uniquement",
    coWatching: "Co-Lecture",
    soloViewing: "Visionnage Solo",
    syncOffline: "Sync Hors ligne",
    active: "Actif",
    theaterChat: "Chat de la Salle",
    typeMessage: "Écrire un message...",
    whisper: "Chuchoter quelque chose de doux...",
    noMessages: "Aucun message pour l'instant",
    lights: "💡 Lumières",
    audio: "🔊 Audio",
    fight: "🍿 Bataille",
    cuddle: "🤗 Câlin",
    stickers: "Stickers",
    openTab: "Ouvrir dans un Nouvel Onglet",
    tryAgain: "Réessayer",
    embedError: "Cette source ne prend pas en charge l'intégration",
    language: "Langue",
    subtitles: "Sous-titres",
    audioTrack: "Piste Audio"
  },
  de: {
    lobby: "Kino-Lobby",
    exit: "Kinosaal verlassen",
    waiting: "Warten auf Partner...",
    partnerLobby: "Partner in der Lobby",
    partnerHall: "Partner im Saal",
    chooseDifferent: "Anderen Film wählen",
    readyWatch: "Ich bin bereit zum Anschauen 🍿",
    readyWaiting: "Bereit! Warten",
    theaterSetup: "Kino-Einrichtung",
    dateSnacks: "Date-Snacks konfigurieren",
    syncLocal: "Lokale Videowiedergabe synchronisieren",
    gdriveTitle: "Über Google Drive ansehen",
    localTitle: "Lokale Datei ansehen (Kein Puffern)",
    searchPlaceholder: "Filme & Serien suchen...",
    watchlist: "Merkliste",
    history: "Verlauf",
    streamReady: "Stream bereit",
    remoteOnly: "Nur Remote",
    coWatching: "Zusammen ansehen",
    soloViewing: "Einzelwiedergabe",
    syncOffline: "Sync offline",
    active: "Aktiv",
    theaterChat: "Kino-Chat",
    typeMessage: "Nachricht schreiben...",
    whisper: "Flüstere etwas Süßes...",
    noMessages: "Noch keine Nachrichten",
    lights: "💡 Licht",
    audio: "🔊 Audio",
    fight: "🍿 Kampf",
    cuddle: "🤗 Kuscheln",
    stickers: "Sticker",
    openTab: "In neuem Tab öffnen",
    tryAgain: "Erneut versuchen",
    embedError: "Diese Quelle unterstützt keine Einbettung",
    language: "Sprache",
    subtitles: "Untertitel",
    audioTrack: "Tonspur"
  },
  hi: {
    lobby: "सिनेमा लॉबी",
    exit: "सिनेमा हॉल से बाहर निकलें",
    waiting: "साथी की प्रतीक्षा कर रहे हैं...",
    partnerLobby: "साथी लॉबी में है",
    partnerHall: "साथी हॉल में है",
    chooseDifferent: "दूसरी फिल्म चुनें",
    readyWatch: "मैं देखने के लिए तैयार हूँ 🍿",
    readyWaiting: "तैयार! प्रतीक्षा जारी",
    theaterSetup: "थिएटर सेटअप",
    dateSnacks: "डेट स्नैक्स सेट करें",
    syncLocal: "लोकल वीडियो प्लेबैक सिंक करें",
    gdriveTitle: "गूगल ड्राइव लिंक से देखें",
    localTitle: "लोकल फ़ाइल देखें (बिना बफरिंग)",
    searchPlaceholder: "फिल्में और टीवी शोज़ खोजें...",
    watchlist: "वॉचलिस्ट",
    history: "देखा गया इतिहास",
    streamReady: "स्ट्रीम तैयार",
    remoteOnly: "केवल रिमोट",
    coWatching: "साथ में देखना",
    soloViewing: "अकेले देखना",
    syncOffline: "सिंक ऑफलाइन",
    active: "सक्रिय",
    theaterChat: "थिएटर चैट",
    typeMessage: "संदेश टाइप करें...",
    whisper: "कुछ मीठा फुसफुसाएं...",
    noMessages: "कोई संदेश नहीं",
    lights: "💡 लाइट्स",
    audio: "🔊 ऑडियो",
    fight: "🍿 फाइट",
    cuddle: "🤗 गले लगाना",
    stickers: "स्टिकर",
    openTab: "नए टैब में खोलें",
    tryAgain: "पुनः प्रयास करें",
    embedError: "यह स्रोत एम्बेडिंग का समर्थन नहीं करता है",
    language: "भाषा",
    subtitles: "सबटाइटल्स",
    audioTrack: "ऑडियो ट्रैक"
  },
  ja: {
    lobby: "シネマロビー",
    exit: "シアターを退室する",
    waiting: "パートナーを待っています...",
    partnerLobby: "パートナーがロビーにいます",
    partnerHall: "パートナーがシアターにいます",
    chooseDifferent: "別の映画を選ぶ",
    readyWatch: "視聴の準備完了 🍿",
    readyWaiting: "準備完了！待機中",
    theaterSetup: "シアター設定",
    dateSnacks: "デートのスナックを設定",
    syncLocal: "ローカル動画の同期再生",
    gdriveTitle: "Googleドライブ経由で視聴",
    localTitle: "ローカルファイルを再生 (バッファなし)",
    searchPlaceholder: "映画やドラマを検索...",
    watchlist: "ウォッチリスト",
    history: "視聴履歴",
    streamReady: "配信準備完了",
    remoteOnly: "リモートのみ",
    coWatching: "同時視聴中",
    soloViewing: "ソロ視聴中",
    syncOffline: "オフライン同期",
    active: "アクティブ",
    theaterChat: "シアターチャット",
    typeMessage: "メッセージを入力...",
    whisper: "甘い言葉をささやいて...",
    noMessages: "メッセージはまだありません",
    lights: "💡 照明",
    audio: "🔊 音声",
    fight: "🍿 投げ合い",
    cuddle: "🤗 ハグ",
    stickers: "ステッカー",
    openTab: "新しいタブで開く",
    tryAgain: "再試行",
    embedError: "このソースは埋め込みに対応していません",
    language: "言語",
    subtitles: "字幕",
    audioTrack: "音声トラック"
  }
};

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRespondingToSocketRef = useRef(false);

  // New UI specific states
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  // Chat Enhancement States
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [activeStickerPack, setActiveStickerPack] = useState<string>("romantic");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "settings">("chat");

  // Language States
  const [uiLang, setUiLang] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("love-cinema-ui-lang") || "en";
    }
    return "en";
  });
  const [subtitleLang, setSubtitleLang] = useState<string>("en");
  const [audioLang, setAudioLang] = useState<string>("original");

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

  // Map of TMDB-based sources (key → url builder fn using TMDB ID)
  const tmdbSourceBuilders: Record<string, (tmdbId: string, mediaType: string) => string> = {
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

    if (sourceKey === "default") {
      try {
        setResolvingSource(true);
        const res = await api.get(`/movies/${session.movieId}`);
        if (res.data.success && res.data.data.watchLink) {
          if (session.showStarted) {
            socket.emit("cinema_change_source", {
              relationshipId: getRelationshipId(user.relationshipId),
              watchLink: res.data.data.watchLink,
              sourceKey: "default",
            });
          } else {
            socket.emit("cinema_select_movie", {
              relationshipId: getRelationshipId(user.relationshipId),
              movieId: session.movieId,
              movieTitle: session.movieTitle,
              movieType: session.movieType,
              watchLink: res.data.data.watchLink,
            });
          }
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
        let tmdbId: string | null = null;

        // --- Attempt 1: Wikidata SPARQL (exact match) ---
        const typeFilter =
          session.movieType === "movie"
            ? `VALUES ?class { wd:Q11424 wd:Q29168811 wd:Q24869 }`
            : `VALUES ?class { wd:Q5398426 wd:Q21191270 wd:Q63952888 }`;

        const exactQuery = `
          SELECT ?imdbID ?tmdbID WHERE {
            ${typeFilter}
            ?item wdt:P31 ?class .
            ?item wdt:P345 ?imdbID .
            OPTIONAL { ?item wdt:P4947 ?tmdbID . }
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
              if (bindings[0].tmdbID) tmdbId = bindings[0].tmdbID.value;
            }
          }
        } catch {
          console.warn("Wikidata exact query failed, trying fuzzy...");
        }

        // --- Attempt 2: Wikidata SPARQL (fuzzy CONTAINS match) ---
        if (!imdbId) {
          const fuzzyQuery = `
            SELECT ?imdbID ?tmdbID WHERE {
              ${typeFilter}
              ?item wdt:P31 ?class .
              ?item wdt:P345 ?imdbID .
              OPTIONAL { ?item wdt:P4947 ?tmdbID . }
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
                if (!tmdbId && bindings[0].tmdbID) tmdbId = bindings[0].tmdbID.value;
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

        // Build all alternative links from our resolved IMDB ID + TMDB ID
        if (imdbId || tmdbId) {
          const built: Record<string, string> = {};
          if (imdbId) {
            for (const [key, builder] of Object.entries(altSourceBuilders)) {
              built[key] = builder(imdbId, mediaType);
            }
          }
          if (tmdbId) {
            for (const [key, builder] of Object.entries(tmdbSourceBuilders)) {
              built[key] = builder(tmdbId, mediaType);
            }
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
      // Use cinema_change_source when show is already started to preserve session state
      if (session.showStarted) {
        socket.emit("cinema_change_source", {
          relationshipId: getRelationshipId(user.relationshipId),
          watchLink: links[sourceKey],
          sourceKey,
        });
      } else {
        socket.emit("cinema_select_movie", {
          relationshipId: getRelationshipId(user.relationshipId),
          movieId: session.movieId,
          movieTitle: session.movieTitle,
          movieType: session.movieType,
          watchLink: links[sourceKey],
        });
      }
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

      if (Math.abs(video.currentTime - data.currentTime) > 1.5) {
        video.currentTime = data.currentTime;
      }

      if (data.status === "playing") {
        video.play().catch(() => {});
      } else {
        video.pause();
      }

      setTimeout(() => {
        isRespondingToSocketRef.current = false;
      }, 500);
    });

    socket.on("cinema_server_changed", (data: { server: string }) => {
      document.body.setAttribute("data-love-sync-server", data.server);
    });

    // Listen to source changes from partner (syncs the dropdown)
    socket.on("cinema_source_changed", (data: { sourceKey: string; watchLink: string }) => {
      setActiveSource(data.sourceKey);
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
      socket.off("cinema_dim_lights_changed");
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
    let link = movie.watchLink || "";

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
      movieType: movie.type,
      watchLink: link,
    });
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
      },
      onPause: () => {
        if (isRespondingToSocketRef.current || !socket) return;
        const relId = getRelationshipId(user?.relationshipId || "");
        socket.emit("cinema_state_change", {
          relationshipId: relId,
          status: "paused",
          currentTime: videoRef.current?.currentTime || 0,
        });
      },
      onSeeked: () => {
        if (isRespondingToSocketRef.current || !socket) return;
        const relId = getRelationshipId(user?.relationshipId || "");
        socket.emit("cinema_state_change", {
          relationshipId: relId,
          status: videoRef.current?.paused ? "paused" : "playing",
          currentTime: videoRef.current?.currentTime || 0,
        });
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
            className="w-full h-full object-contain max-h-[85vh] rounded-2xl border border-white/5 shadow-2xl bg-black"
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
          className="w-full h-full object-contain max-h-[85vh] rounded-2xl border border-white/5 shadow-2xl bg-black"
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
          className="w-full h-full object-contain max-h-[85vh] rounded-2xl border border-white/5 shadow-2xl bg-black"
          controls
          autoPlay
          playsInline
        />
      );
    }

    return (
      <iframe
        src={session.watchLink}
        className="w-full h-full border-0 animate-fade-in"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }, [session?.watchLink, session?.movieId, session?.movieTitle, gdrivePlayerMode, localFile, localFileUrl]);

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
                  <span>{translations[uiLang]?.exit || "Exit Cinema Hall"}</span>
                </button>
                <h1 className="text-3xl font-extrabold text-white tracking-wide font-serif cinema-spotlight">
                  {translations[uiLang]?.lobby || "Cinema Lobby"}
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  {uiLang === "en" ? "Select a movie from your shared list to watch together" : 
                   uiLang === "es" ? "Selecciona una película de tu lista compartida para verla juntos" :
                   uiLang === "fr" ? "Sélectionnez un film de votre liste partagée pour le regarder ensemble" :
                   uiLang === "de" ? "Wähle einen Film aus deiner geteilten Liste aus, um ihn zusammen anzusehen" :
                   uiLang === "hi" ? "साथ में देखने के लिए अपनी साझा सूची से एक फिल्म चुनें" :
                   "共同視聴するために共有リストから映画を選択します"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Language Selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{translations[uiLang]?.language || "Language"}:</span>
                  <select
                    value={uiLang}
                    onChange={(e) => {
                      setUiLang(e.target.value);
                      localStorage.setItem("love-cinema-ui-lang", e.target.value);
                      playSound("tap");
                    }}
                    className="bg-zinc-900/60 border border-white/5 text-[10px] font-bold rounded-lg px-2.5 py-1 text-zinc-305 focus:outline-none focus:border-[#E8587A]/30 cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                  <Users className="w-4 h-4 text-[#E8587A]" />
                  <span className="text-xs font-bold text-zinc-300">
                    {isPartnerPresent
                      ? (translations[uiLang]?.partnerLobby || "Partner in Lobby")
                      : (translations[uiLang]?.waiting || "Waiting for partner...")}
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
                      {translations[uiLang]?.gdriveTitle || "Watch via Google Drive Link"}
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      {uiLang === "en" ? "Paste any shared Google Drive video link to watch it in real-time sync with your partner" :
                       uiLang === "es" ? "Pega cualquier enlace de video compartido de Google Drive para verlo en sincronización con tu pareja" :
                       uiLang === "fr" ? "Collez n'importe quel lien vidéo Google Drive partagé pour le regarder en synchronisation avec votre partenaire" :
                       uiLang === "de" ? "Füge einen geteilten Google Drive-Videolink ein, um ihn mit deinem Partner synchronisiert anzusehen" :
                       uiLang === "hi" ? "अपने साथी के साथ वास्तविक समय में सिंक करके देखने के लिए कोई भी साझा Google ड्राइव वीडियो लिंक पेस्ट करें" :
                       "共有されたGoogleドライブの動画リンクを貼り付けて、パートナーとリアルタイムで同期して視聴します"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <input
                    type="text"
                    placeholder={uiLang === "hi" ? "शीर्षक दर्ज करें (वैकल्पिक)" : uiLang === "es" ? "Ingresar título (opcional)" : uiLang === "ja" ? "タイトルを入力 (任意)" : "Enter Title (optional)"}
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
                      <span>{uiLang === "hi" ? "लोड करें" : uiLang === "ja" ? "読み込む" : uiLang === "es" ? "Cargar" : "Load"}</span>
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
                      {translations[uiLang]?.localTitle || "Watch a Local File (Zero Buffering)"}
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      {uiLang === "en" ? "Play a video file (MP4/MKV) from your PC. Partner loads their copy of the file for 100% sync!" :
                       uiLang === "es" ? "Reproduce un archivo de video (MP4/MKV) desde tu PC. ¡El compañero carga su copia para una sincronización del 100%!" :
                       uiLang === "fr" ? "Lisez un fichier vidéo (MP4/MKV) depuis votre PC. Le partenaire charge sa copie pour une synchronisation à 100% !" :
                       uiLang === "de" ? "Spiele eine Videodatei (MP4/MKV) von deinem PC ab. Der Partner lädt seine Kopie für eine 100%ige Synchronisierung!" :
                       uiLang === "hi" ? "अपने पीसी से एक वीडियो फ़ाइल (MP4/MKV) चलाएं। 100% सिंक के लिए साथी फ़ाइल की अपनी प्रति लोड करता है!" :
                       "PCから動画ファイル(MP4/MKV)を再生します。パートナーも同じファイルを読み込むことで100%同期再生されます！"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full">
                  <label className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#D4A574] to-[#E8587A] text-white text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2 flex-shrink-0">
                    <span>{uiLang === "es" ? "Elegir archivo" : uiLang === "fr" ? "Choisir un fichier" : uiLang === "de" ? "Datei auswählen" : uiLang === "hi" ? "फ़ाइल चुनें" : uiLang === "ja" ? "ファイルを選択" : "Choose Video File"}</span>
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
                      {uiLang === "es" ? "Seleccionado" : uiLang === "ja" ? "選択済み" : "Selected"}: {localFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">
                      {uiLang === "es" ? "Ningún archivo seleccionado" : uiLang === "ja" ? "ファイル未選択" : uiLang === "hi" ? "कोई फ़ाइल नहीं चुनी गई" : "No file chosen"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={translations[uiLang]?.searchPlaceholder || "Search movies & TV shows..."}
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
                  {translations[uiLang]?.watchlist || "Watchlist"}
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
                  {translations[uiLang]?.history || "Watched History"}
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
                              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">{uiLang === "es" ? "Sin portada" : uiLang === "ja" ? "カバーなし" : "No Cover"}</span>
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
                                {movie.watchLink ? (uiLang === "es" ? "Disponible" : uiLang === "ja" ? "再生可能" : "Available") : (uiLang === "es" ? "Sinc. Solo" : "Sync Only")}
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
                                  <span className="text-zinc-400">{translations[uiLang]?.streamReady || "Stream Ready"}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                  <span className="text-zinc-500">{translations[uiLang]?.remoteOnly || "Remote Only"}</span>
                                </>
                              )}
                            </span>
                            <button className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-[#E8587A] text-white text-[10px] font-bold transition-all cursor-pointer hover:shadow-lg hover:shadow-[#E8587A]/25 active:scale-95">
                              {uiLang === "es" ? "Cargar 🎬" : uiLang === "fr" ? "Lancer 🎬" : uiLang === "de" ? "Laden 🎬" : uiLang === "hi" ? "लोड 🎬" : uiLang === "ja" ? "読み込む 🎬" : "Load 🎬"}
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
                <span>{translations[uiLang]?.chooseDifferent || "Choose Different Movie"}</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400">
                <Users className="w-4 h-4 text-[#E8587A]" />
                <span className="text-xs font-bold">
                  {isPartnerPresent
                    ? (translations[uiLang]?.partnerHall || "Partner in Hall")
                    : (translations[uiLang]?.waiting || "Waiting for partner...")}
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
                {translations[uiLang]?.theaterSetup || "Theater Setup"}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide mt-4 mb-3 font-serif cinema-spotlight leading-tight">
                {session.movieTitle}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-md">
                {!isPartnerPresent
                  ? (uiLang === "es" ? "Esperando a que tu pareja entre. ¡Ponte cómodo, prepara las bebidas y los snacks! 🍿" :
                     uiLang === "fr" ? "En attente de l'entrée de votre partenaire. Installez-vous confortablement, préparez les boissons et les snacks ! 🍿" :
                     uiLang === "de" ? "Warte darauf, dass dein Partner eintritt. Mach es dir gemütlich, bereite die Getränke vor und stelle die Snacks bereit! 🍿" :
                     uiLang === "hi" ? "आपके साथी के प्रवेश करने की प्रतीक्षा की जा रही है। सहज हो जाएं, पेय तैयार करें और स्नैक्स सेट करें! 🍿" :
                     uiLang === "ja" ? "パートナーが入室するのを待っています。快適にして、飲み物を準備し、スナックをセットしましょう！ 🍿" :
                     "Waiting for your partner to enter. Get cozy, prepare the drinks, and set the snacks! 🍿")
                  : (uiLang === "es" ? "¡Ambos asientos están ocupados! Confirma que estás listo para abrir las cortinas. 🎬" :
                     uiLang === "fr" ? "Les deux places sont occupées ! Confirmez que vous êtes prêt pour ouvrir les rideaux. 🎬" :
                     uiLang === "de" ? "Beide Plätze sind besetzt! Bestätige die Bereitschaft, um die Vorhänge zu öffnen. 🎬" :
                     uiLang === "hi" ? "दोनों सीटें भरी हुई हैं! पर्दे खोलने के लिए तत्परता की पुष्टि करें। 🎬" :
                     uiLang === "ja" ? "両方の席が埋まりました！準備完了を確認してカーテンを開けましょう。 🎬" :
                     "Both watching seats are filled! Confirm readiness to open the screen curtains. 🎬")}
              </p>

              {/* Ready Status Circles */}
              <div className="flex items-center gap-12 mt-10">
                {/* Self Status */}
                <div className="flex flex-col items-center gap-3">
                  <div className={cn("cinema-ready-orb", isSelfReady && "ready")}>
                    <Users className="w-6 h-6 text-zinc-500" />
                  </div>
                  <span className="text-xs font-extrabold text-zinc-400">
                    {uiLang === "es" ? "Tú" : uiLang === "fr" ? "Toi" : uiLang === "de" ? "Du" : uiLang === "hi" ? "आप" : uiLang === "ja" ? "あなた" : "You"}
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
                    {uiLang === "es" ? "Pareja" : uiLang === "fr" ? "Partenaire" : uiLang === "de" ? "Partner" : uiLang === "hi" ? "साथी" : uiLang === "ja" ? "パートナー" : "Partner"}
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
                      ? `${translations[uiLang]?.readyWaiting || "Ready! Waiting"} (${readyCount}/2)`
                      : (translations[uiLang]?.readyWatch || "I am Ready to Watch 🍿")}
                  </span>
                </button>
              </div>
            </div>

            {/* Cozy Snacks Checklist Card (Pre-show bottom) */}
            <div className="cinema-glass-panel p-5 max-w-md w-full border border-white/5">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                <Coffee className="w-4 h-4 text-[#D4A574]" />
                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                  {translations[uiLang]?.dateSnacks || "Configure Date Snacks"}
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
                    <span>{translations[uiLang]?.active?.toUpperCase() || "LIVE"}</span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{translations[uiLang]?.soloViewing || "Solo Viewing"}</span>
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
                    {isExtensionActive
                      ? (translations[uiLang]?.active || "Active")
                      : (translations[uiLang]?.syncOffline || "Sync Offline")}
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
                "cinema-bar-transition cinema-control-glow absolute bottom-6 left-1/2 -translate-x-1/2 cinema-glass-panel p-2 flex items-center justify-center gap-3.5 z-40 max-w-[95%] w-[210px]",
                !controlsVisible && "cinema-bar-hidden cinema-controls-hidden"
              )}
            >
              {/* 1. Lights dim toggle */}
              <button
                onClick={handleToggleLights}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border",
                  dimmed
                    ? "bg-[#D4A574]/20 border-[#D4A574]/40 text-[#D4A574] shadow-[0_0_10px_rgba(212,165,116,0.2)]"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
                title="Toggle Ambient Lights"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* 2. Audio Mute Toggle */}
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

              {/* 3. Settings Sidebar Tab Toggle */}
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
                {sidebarTab === "chat" ? (translations[uiLang]?.theaterChat || "Theater Chat") : (translations[uiLang]?.settings || "Settings")}
              </h3>
              {isPartnerPresent && (
                <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {uiLang === "es" ? "Pareja en línea" : uiLang === "ja" ? "パートナーオンライン" : uiLang === "hi" ? "साथी ऑनलाइन है" : "Partner online"}
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
        <div className="flex border-b border-white/5 p-1 bg-black/10 shrink-0">
          <button
            onClick={() => { setSidebarTab("chat"); playSound("tap"); }}
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 border border-transparent",
              sidebarTab === "chat"
                ? "bg-white/[0.04] text-[#E8587A] border-white/5 shadow-inner"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => { setSidebarTab("settings"); playSound("tap"); }}
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 border border-transparent",
              sidebarTab === "settings"
                ? "bg-white/[0.04] text-[#D4A574] border-white/5 shadow-inner"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{translations[uiLang]?.settings || "Settings"}</span>
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
                  <p className="text-sm font-extrabold text-zinc-300 font-serif">{translations[uiLang]?.whisper || "Whisper something sweet..."}</p>
                  <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px] leading-relaxed">
                    {uiLang === "es" ? "El chat de tu cita de cine — comparte reacciones, envía pegatinas y susurra dulces palabras 💕" :
                     uiLang === "fr" ? "Le chat de votre soirée cinéma — partagez des réactions, envoyez des stickers et chuchotez des mots doux 💕" :
                     uiLang === "de" ? "Dein Kino-Date-Chat — teile Reaktionen, sende Sticker und flüstere süße Worte 💕" :
                     uiLang === "hi" ? "आपकी सिनेमा डेट चैट — प्रतिक्रियाएं साझा करें, स्टिकर भेजें और कुछ मीठा फुसफुसाएं 💕" :
                     uiLang === "ja" ? "映画デートのチャット — リアクションを共有し、ステッカーを送り、甘い言葉をささやき合いましょう 💕" :
                     "Your movie date chat — share reactions, send stickers, and whisper sweet nothings 💕"}
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
                      "flex flex-col max-w-[85%] gap-0.5",
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
                    {uiLang === "es" ? "escribiendo..." : uiLang === "ja" ? "入力中..." : uiLang === "hi" ? "टाइप कर रहे हैं..." : "typing..."}
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
                        {pack.label === "Romantic" && uiLang === "es" ? "Romántico" : 
                         pack.label === "Romantic" && uiLang === "ja" ? "恋愛" :
                         pack.label === "Reactions" && uiLang === "es" ? "Reacciones" :
                         pack.label === "Reactions" && uiLang === "ja" ? "リアクション" :
                         pack.label === "Cozy Vibes" && uiLang === "es" ? "Acogedor" :
                         pack.label === "Cozy Vibes" && uiLang === "ja" ? "まったり" :
                         pack.label}
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

            {/* Quick Emoji Row */}
            <div className="cinema-emoji-row flex items-center gap-1 px-4 py-2 border-t border-white/5 overflow-x-auto shrink-0">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendSticker(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-lg transition-all cursor-pointer active:scale-90 shrink-0"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Send Form — Enhanced */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-black/20 flex flex-col gap-2 shrink-0">
              <div className="flex gap-2 items-end">
                {/* Sticker Toggle Button */}
                <button
                  type="button"
                  onClick={() => setStickerPickerOpen(!stickerPickerOpen)}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0",
                    stickerPickerOpen
                      ? "bg-[#D4A574]/15 text-[#D4A574] border border-[#D4A574]/25"
                      : "bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
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
                  placeholder={translations[uiLang]?.typeMessage || "Type a message..."}
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8587A]/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-md shrink-0",
                    chatInput.trim()
                      ? "bg-[#E8587A] hover:bg-[#BE3A6E] text-white shadow-[#BE3A6E]/10"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed shadow-none"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Settings Tab Content */
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 cinema-scrollbar">
            {/* Quick Actions Card */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Quick Actions</span>
              <div className="flex gap-3">
                <button
                  onClick={handleToggleLights}
                  className={cn(
                    "flex-1 py-3 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5",
                    dimmed
                      ? "bg-[#D4A574]/15 border-[#D4A574]/30 text-[#D4A574]"
                      : "bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.04]"
                  )}
                >
                  <Tv className="w-4 h-4" />
                  <span>{dimmed ? "Brighten Lights" : "Dim Lights"}</span>
                </button>
                <button
                  onClick={() => setVideoMuted(prev => !prev)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5",
                    videoMuted
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-450"
                      : "bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.04]"
                  )}
                >
                  {videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{videoMuted ? "Unmute Audio" : "Mute Audio"}</span>
                </button>
              </div>
            </div>

            {/* Streaming Config Group */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-4">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Streaming Server & Source</span>

              {/* Source selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400">Stream Provider Source</label>
                {session?.movieId?.startsWith("gdrive-") ? (
                  <div className="bg-zinc-900/60 border border-white/5 text-[10px] font-bold rounded-lg px-2.5 py-2 text-zinc-300 flex items-center justify-between select-none">
                    <span>📁 Google Drive</span>
                    <button
                      onClick={() => setGdrivePlayerMode(prev => prev === "iframe" ? "html5" : "iframe")}
                      className="text-[8px] font-black uppercase text-[#E8587A] hover:underline"
                    >
                      {gdrivePlayerMode === "iframe" ? "Force Direct" : "Use Google Player"}
                    </button>
                  </div>
                ) : resolvingSource ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                    <Loader2 className="w-3 animate-spin text-[#E8587A]" />
                    <span>Resolving stream links...</span>
                  </div>
                ) : (
                  <select
                    value={activeSource}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="bg-zinc-900/60 border border-white/5 text-xs font-bold rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-[#E8587A]/30 cursor-pointer w-full"
                  >
                    <option value="default">🎬 1HD (Default)</option>
                    <option value="cineby">🌟 Cineby (Recommended)</option>
                    <option value="bflix">🅱️ BFlix</option>
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
              </div>

              {/* Server selector (Only if default 1HD active) */}
              {activeSource === "default" && !session?.movieId?.startsWith("gdrive-") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400">Preferred Mirror Server</label>
                  <select
                    value={session.activeServer || "upcloud"}
                    onChange={(e) => handleServerChange(e.target.value)}
                    className="bg-zinc-900/60 border border-white/5 text-xs font-bold rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none w-full"
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
                <label className="text-[10px] font-bold text-zinc-400">{translations[uiLang]?.subtitles || "Subtitles"}</label>
                <select
                  value={subtitleLang}
                  onChange={(e) => {
                    setSubtitleLang(e.target.value);
                    handleLanguageSync(e.target.value, audioLang);
                    playSound("tap");
                  }}
                  className="bg-zinc-900/60 border border-white/5 text-xs font-bold rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none w-full"
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
                <label className="text-[10px] font-bold text-zinc-400">{translations[uiLang]?.audioTrack || "Audio Track"}</label>
                <select
                  value={audioLang}
                  onChange={(e) => {
                    setAudioLang(e.target.value);
                    handleLanguageSync(subtitleLang, e.target.value);
                    playSound("tap");
                  }}
                  className="bg-zinc-900/60 border border-white/5 text-xs font-bold rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none w-full"
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

              {/* UI Translation Selection */}
              <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                <label className="text-[10px] font-bold text-zinc-400">{translations[uiLang]?.language || "UI Language"}</label>
                <select
                  value={uiLang}
                  onChange={(e) => {
                    setUiLang(e.target.value);
                    localStorage.setItem("love-cinema-ui-lang", e.target.value);
                    playSound("tap");
                  }}
                  className="bg-zinc-900/60 border border-white/5 text-xs font-bold rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none w-full"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 100% Reliable Embed Connection Fallback Link */}
            {session.watchLink && (
              <div className="p-4 rounded-2xl bg-[#E8587A]/5 border border-[#E8587A]/20 flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#E8587A] flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-[#E8587A] tracking-wider">Embed Fallback</span>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      If the video fails to load, displays connection errors, or states embedding is blocked:
                    </p>
                  </div>
                </div>
                <a
                  href={session.watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E8587A] to-[#D4A574] text-white text-xs font-extrabold shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-white/10"
                >
                  <span>{translations[uiLang]?.openTab || "Open in New Tab"} ↗</span>
                </a>
              </div>
            )}

            {/* Date Interactions Drawer Card */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-3">
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Interactive Date Triggers</span>
              <div className="grid grid-cols-6 gap-1 justify-items-center">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-lg transition-all cursor-pointer active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-2">
                <button
                  onClick={handleThrowPopcorn}
                  className="bg-white/5 hover:bg-white/10 text-zinc-300 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border border-white/5 flex items-center justify-center gap-1.5"
                >
                  <span>🍿 {translations[uiLang]?.fight || "Fight"}</span>
                </button>
                <button
                  onClick={handleSendCuddle}
                  className="bg-[#E8587A]/15 hover:bg-[#E8587A]/25 text-[#E8587A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border border-[#E8587A]/20 flex items-center justify-center gap-1.5"
                >
                  <span>🤗 {translations[uiLang]?.cuddle || "Cuddle"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
