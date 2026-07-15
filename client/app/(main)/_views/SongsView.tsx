"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Plus, Trash2, ExternalLink, Loader2, X, Play, Heart, Search, Sparkles, Globe, Link, Info } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToastStore } from "@/stores/useToastStore";
import { useAudioPlayerStore } from "@/stores/useAudioPlayerStore";

interface Song {
  _id: string;
  title: string;
  artist: string;
  url: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  notes?: string;
  youtubeVideoId?: string;
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.67-.136-.75-.472-.075-.336.136-.67.472-.75 3.856-.882 7.15-.5 9.822 1.137.295.18.387.565.207.86zm1.224-2.724c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.075-1.182-.413.125-.85-.107-.978-.52-.128-.413.107-.85.52-.978 3.66-1.11 8.23-.574 11.347 1.342.367.226.487.707.26 1.074zm.106-2.833C14.384 8.71 8.563 8.52 5.2 9.54c-.5.15-.82-.2-.97-.57-.15-.5.2-.82.57-.97 3.86-1.17 10.3-1.01 14.37 1.4.45.27.6.85.33 1.3-.27.45-.85.6-1.3.33z"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.528 3.545 12 3.545 12 3.545s-7.528 0-9.388.51a3.004 3.004 0 0 0-2.11 2.108C0 8.023 0 12 0 12s0 3.977.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.86.51 9.388.51 9.388.51s7.528 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.977 24 12 24 12s0-3.977-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const showToast = useToastStore((s) => s.showToast);

  // Global Audio Player
  const { playSong, currentSong, isPlaying } = useAudioPlayerStore();

  // Add Song Modal Form State
  const [addMode, setAddMode] = useState<"search" | "url">("search");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState(""); // URL input (spotify or youtube)
  const [extraDetails, setExtraDetails] = useState(""); // language or other descriptors
  const [notes, setNotes] = useState("");

  // Resolved Bot Search State
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [botSearching, setBotSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Player preferences (toggling between spotify preview and full youtube playback)
  const [playerPreferences, setPlayerPreferences] = useState<Record<string, "youtube" | "spotify">>({});

  // Auto-trigger bot if URL is pasted and meets basic criteria
  useEffect(() => {
    if (addMode !== "url" || !url) return;
    
    // Check if it's a valid youtube or spotify URL
    const isSpotify = url.includes("spotify.com/track");
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
    if (!isSpotify && !isYoutube) return;

    try {
      new URL(url);
    } catch (_) {
      return;
    }

    const timer = setTimeout(() => {
      triggerBotSearch({ urlInput: url });
    }, 800);

    return () => clearTimeout(timer);
  }, [url, addMode]);

  const triggerBotSearch = async ({ urlInput, titleInput, artistInput, detailsInput }: {
    urlInput?: string;
    titleInput?: string;
    artistInput?: string;
    detailsInput?: string;
  }) => {
    setBotSearching(true);
    setError("");
    setSearchPerformed(true);

    try {
      const response = await api.post("/songs/fetch-details", {
        url: urlInput || undefined,
        title: titleInput || undefined,
        artist: artistInput || undefined,
        extraDetails: detailsInput || undefined,
      });

      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setTitle(d.title || "");
        setArtist(d.artist || "");
        setSpotifyUrl(d.spotifyUrl || "");
        setYoutubeUrl(d.youtubeUrl || "");
        setYoutubeVideoId(d.youtubeVideoId || "");

        // Set main url parameter to whatever we resolved (prefer Spotify link, fallback to Youtube)
        if (d.spotifyUrl) {
          setUrl(d.spotifyUrl);
        } else if (d.youtubeUrl) {
          setUrl(d.youtubeUrl);
        }
      } else {
        setError("Bot could not find any matching details.");
      }
    } catch (err: any) {
      console.error("Bot search failed:", err);
      setError(err.response?.data?.error || "Bot search failed to find links. Fill them manually.");
    } finally {
      setBotSearching(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError("Please enter a song title");
      return;
    }
    triggerBotSearch({
      titleInput: title,
      artistInput: artist,
      detailsInput: extraDetails
    });
  };

  const fetchSongs = async () => {
    try {
      const response = await api.get("/songs");
      if (response.data.success) {
        setSongs(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load songs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchSongs());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist || !url) {
      setError("Title, Artist, and a primary URL are required. Try running the bot search first.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/songs", {
        title,
        artist,
        url,
        spotifyUrl: spotifyUrl || undefined,
        youtubeUrl: youtubeUrl || undefined,
        youtubeVideoId: youtubeVideoId || undefined,
        notes: notes || undefined,
      });

      if (response.data.success) {
        setSongs((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        // Reset states
        setTitle("");
        setArtist("");
        setUrl("");
        setExtraDetails("");
        setNotes("");
        setSpotifyUrl("");
        setYoutubeUrl("");
        setYoutubeVideoId("");
        setSearchPerformed(false);
        showToast("Song added to playlist! 🎵", "success");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add song");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    try {
      await api.delete(`/songs/${id}`);
      setSongs((prev) => prev.filter((s) => s._id !== id));
      showToast("Song deleted.", "success");
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  // Helper to resolve embed links
  const getEmbedUrl = (rawUrl: string) => {
    try {
      const urlObj = new URL(rawUrl);
      if (urlObj.hostname.includes("spotify.com")) {
        const trackId = urlObj.pathname.split("/").pop();
        if (urlObj.pathname.includes("/track/")) {
          return `https://open.spotify.com/embed/track/${trackId}`;
        } else if (urlObj.pathname.includes("/playlist/")) {
          return `https://open.spotify.com/embed/playlist/${trackId}`;
        } else if (urlObj.pathname.includes("/album/")) {
          return `https://open.spotify.com/embed/album/${trackId}`;
        }
      } else if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
        let videoId = "";
        if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.substring(1);
        } else {
          videoId = urlObj.searchParams.get("v") || "";
        }
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
        }
      }
    } catch (e) {}
    return null;
  };

  const getSpotifyTrackEmbed = (spotifyUrlInput?: string) => {
    if (!spotifyUrlInput) return "";
    try {
      const urlObj = new URL(spotifyUrlInput);
      const trackId = urlObj.pathname.split("/").pop();
      if (urlObj.pathname.includes("/track/")) {
        return `https://open.spotify.com/embed/track/${trackId}`;
      }
    } catch (e) {}
    return "";
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 font-display">
            <Music className="w-8 h-8 text-primary animate-pulse-soft" /> Our Playlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Songs that remind us of each other, our road trips, and cozy nights. Click the play button on any card to stream globally! 🎧
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setSearchPerformed(false);
            setSpotifyUrl("");
            setYoutubeUrl("");
            setYoutubeVideoId("");
            setTitle("");
            setArtist("");
            setExtraDetails("");
            setUrl("");
            setNotes("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Song
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : songs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/50 border border-border/50 rounded-3xl backdrop-blur-sm text-center">
          <Music className="w-12 h-12 text-muted-foreground/30 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-foreground font-display">No songs yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Add your favorite song, a track you both danced to, or Spotify playlists!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {songs.map((song) => {
            const hasYoutubeId = !!song.youtubeVideoId;
            const hasSpotifyUrl = !!song.spotifyUrl;
            const hasYoutubeUrl = !!song.youtubeUrl;

            // Default player preference
            const currentPref = playerPreferences[song._id] || (hasYoutubeId ? "youtube" : "spotify");
            const isCurrentPlaying = currentSong?._id === song._id && isPlaying;

            let embedSrc = "";
            let playerHeight = 80;

            if (currentPref === "youtube" && hasYoutubeId) {
              embedSrc = `https://www.youtube.com/embed/${song.youtubeVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
              playerHeight = 160;
            } else {
              const defaultEmbed = hasSpotifyUrl ? getSpotifyTrackEmbed(song.spotifyUrl) : getEmbedUrl(song.url);
              if (defaultEmbed) {
                embedSrc = defaultEmbed;
                playerHeight = defaultEmbed.includes("spotify.com") ? 80 : 160;
              }
            }

            return (
              <motion.div
                layout
                key={song._id}
                className="card-cozy p-6 flex flex-col justify-between"
                whileHover={{ y: -4, scale: 1.005 }}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-extrabold text-foreground text-base leading-tight">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{song.artist}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Play Button */}
                      {hasYoutubeId && (
                        <button
                          onClick={() => {
                            playSong({
                              _id: song._id,
                              title: song.title,
                              artist: song.artist,
                              youtubeVideoId: song.youtubeVideoId!,
                            });
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 border",
                            isCurrentPlaying
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-muted/80 hover:bg-primary/10 text-muted-foreground hover:text-primary border-border/30"
                          )}
                          title={isCurrentPlaying ? "Playing full audio globally" : "Play full audio globally"}
                        >
                          <Play className={cn("w-3.5 h-3.5", isCurrentPlaying ? "fill-primary" : "")} />
                        </button>
                      )}

                      {/* Spotify Link */}
                      {hasSpotifyUrl && (
                        <a
                          href={song.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 border border-[#1DB954]/20 transition-all flex items-center justify-center"
                          title="Open on Spotify"
                        >
                          <SpotifyIcon className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* YouTube Link */}
                      {hasYoutubeUrl && (
                        <a
                          href={song.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center"
                          title="Open on YouTube"
                        >
                          <YoutubeIcon className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(song._id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                        title="Delete song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {song.notes && (
                    <p className="handwritten text-lg text-foreground bg-background border border-border p-3 rounded-xl mb-4 leading-relaxed italic">
                      &ldquo;{song.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Player Mode Selector (Toggling Spotify and YouTube Full Audio) */}
                {hasSpotifyUrl && hasYoutubeId && (
                  <div className="flex items-center justify-between gap-2 mt-1 mb-3">
                    <div className="flex items-center gap-1 bg-muted/60 dark:bg-muted/40 p-0.5 rounded-lg border border-border/30">
                      <button
                        onClick={() => setPlayerPreferences((prev) => ({ ...prev, [song._id]: "youtube" }))}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer",
                          currentPref === "youtube"
                            ? "bg-primary text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Full Audio (YouTube) 📺
                      </button>
                      <button
                        onClick={() => setPlayerPreferences((prev) => ({ ...prev, [song._id]: "spotify" }))}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer",
                          currentPref === "spotify"
                            ? "bg-primary text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Spotify Card 🎵
                      </button>
                    </div>
                  </div>
                )}

                {/* Embed player if valid */}
                {embedSrc ? (
                  <div className="mt-2 rounded-xl overflow-hidden bg-black/5 dark:bg-black/25">
                    <iframe
                      src={embedSrc}
                      width="100%"
                      height={playerHeight}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="border-0 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="mt-2 py-3 px-4 rounded-xl bg-background border border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">{song.url}</span>
                    <a
                      href={song.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-semibold flex items-center gap-1 hover:underline"
                    >
                      Play <Play className="w-3 h-3 fill-primary" />
                    </a>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20 text-[9px] text-muted-foreground/60 font-medium">
                  <span>Pinned by {song.userId.name}</span>
                  <span>{format(new Date(song.createdAt), "MMM d, yyyy")}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              {/* Gradient Top Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-emerald-500 animate-pulse-soft" />

              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4 font-display">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" /> Song Finder Bot
              </h3>

              {/* Toggle Input Mode */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/50 mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode("search");
                    setError("");
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5",
                    addMode === "search" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Search className="w-3.5 h-3.5" /> Title & Specific Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode("url");
                    setError("");
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5",
                    addMode === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link className="w-3.5 h-3.5" /> Paste URL (Spotify / YouTube)
                </button>
              </div>

              {/* Bot Loading State */}
              {botSearching && (
                <div className="flex flex-col items-center justify-center py-10 bg-muted/20 border border-border/40 rounded-2xl mb-4 gap-2.5">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md filter animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground animate-pulse">
                    Bot is fetching Spotify & YouTube matching links...
                  </p>
                </div>
              )}

              {/* Bot Results Preview */}
              {!botSearching && searchPerformed && (
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/15 pb-2">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-primary" /> Bot Search Results
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchPerformed(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">{title || "Unknown Title"}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{artist || "Unknown Artist"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={cn(
                      "p-2 rounded-xl flex items-center gap-1.5 border",
                      spotifyUrl ? "bg-[#1DB954]/5 border-[#1DB954]/20 text-[#1DB954]" : "bg-muted/40 border-border/40 text-muted-foreground"
                    )}>
                      <SpotifyIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{spotifyUrl ? "Spotify Connected" : "Spotify Link Missing"}</span>
                    </div>
                    <div className={cn(
                      "p-2 rounded-xl flex items-center gap-1.5 border",
                      youtubeUrl ? "bg-rose-500/5 border-rose-500/20 text-rose-500" : "bg-muted/40 border-border/40 text-muted-foreground"
                    )}>
                      <YoutubeIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{youtubeUrl ? "YouTube Connected" : "YouTube Link Missing"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              <form onSubmit={addMode === "search" && !searchPerformed ? handleManualSearch : handleSubmit} className="space-y-4">
                
                {/* 1. Search Mode: Search parameters */}
                {addMode === "search" && !searchPerformed && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Song Title</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Lover, Vachindamma"
                        className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Artist (Optional)</label>
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          placeholder="e.g. Taylor Swift"
                          className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Specific Details (Optional)</label>
                        <input
                          type="text"
                          value={extraDetails}
                          onChange={(e) => setExtraDetails(e.target.value)}
                          placeholder="e.g. Telugu, Sid Sriram"
                          className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. URL Mode: Link parameter */}
                {addMode === "url" && !searchPerformed && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spotify / YouTube Link</label>
                      <input
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste Spotify track or YouTube video link"
                        className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                      <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5 mt-1 px-1">
                        <Info className="w-3 h-3 text-primary shrink-0" /> Pasting automatically starts the bot resolving details.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Notes (Always shows if resolving details or ready to confirm) */}
                {searchPerformed && !botSearching && (
                  <div className="space-y-4">
                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cozy Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Why does this track remind you of us?"
                        className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* If search hasn't run yet in search mode: search link button */}
                  {addMode === "search" && !searchPerformed ? (
                    <button
                      type="submit"
                      disabled={botSearching || !title}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      {botSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Bot is searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" /> Find Song Links with Bot
                        </>
                      )}
                    </button>
                  ) : (
                    /* Confirm submission to DB */
                    <button
                      type="submit"
                      disabled={submitting || botSearching}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                        </>
                      ) : (
                        <>
                          <Music className="w-4 h-4" /> Add Song to Playlist
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
