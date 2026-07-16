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

  // Add Song Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Bot Search Query at top of modal
  const [botQuery, setBotQuery] = useState("");
  const [botSearching, setBotSearching] = useState(false);

  // Player preferences (toggling between spotify preview and full youtube playback)
  const [playerPreferences, setPlayerPreferences] = useState<Record<string, "youtube" | "spotify">>({});

  const handleBotSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!botQuery.trim()) return;

    setBotSearching(true);
    setError("");

    // Determine if the input is a URL or search phrase
    const isUrl = botQuery.startsWith("http://") || botQuery.startsWith("https://");

    try {
      const response = await api.post("/songs/fetch-details", {
        url: isUrl ? botQuery : undefined,
        title: !isUrl ? botQuery : undefined,
      });

      if (response.data.success && response.data.data) {
        const d = response.data.data;
        setTitle(d.title || "");
        setArtist(d.artist || "");
        setSpotifyUrl(d.spotifyUrl || "");
        setYoutubeUrl(d.youtubeUrl || "");
        setYoutubeVideoId(d.youtubeVideoId || "");
        showToast("Bot retrieved song details! 🤖🎵", "success");
      } else {
        setError("Bot could not find any matching details.");
      }
    } catch (err: any) {
      console.error("Bot search failed:", err);
      setError(err.response?.data?.error || "Bot could not find matching links. Please enter details manually.");
    } finally {
      setBotSearching(false);
    }
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
    if (!title || !artist) {
      setError("Title and Artist are required.");
      return;
    }
    
    // Require at least one link to save a song
    const primaryUrl = spotifyUrl || youtubeUrl;
    if (!primaryUrl) {
      setError("At least one Spotify or YouTube link is required to add a song.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/songs", {
        title,
        artist,
        url: primaryUrl,
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
        setSpotifyUrl("");
        setYoutubeUrl("");
        setYoutubeVideoId("");
        setNotes("");
        setBotQuery("");
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
            setTitle("");
            setArtist("");
            setSpotifyUrl("");
            setYoutubeUrl("");
            setYoutubeVideoId("");
            setNotes("");
            setBotQuery("");
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
                <Music className="w-5 h-5 text-primary" /> Add Song to Playlist
              </h3>

              {/* Bot Helper Header */}
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 space-y-3">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 fill-primary text-primary animate-pulse" /> Song Finder Bot (Optional)
                </span>
                <p className="text-xs text-muted-foreground">
                  Type a song name (include language/artist) OR paste a link, then click "Run Bot" to auto-fill the fields below!
                </p>
                <form onSubmit={handleBotSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={botQuery}
                    onChange={(e) => setBotQuery(e.target.value)}
                    placeholder="e.g. Vachindamma Telugu, or Spotify/YouTube link..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={botSearching || !botQuery.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                  >
                    {botSearching ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>🤖 Run Bot</>
                    )}
                  </button>
                </form>
              </div>

              {/* Standard Form Inputs (Always Visible and Editable) */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Song Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lover"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Artist *</label>
                  <input
                    type="text"
                    required
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Taylor Swift"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spotify Track Link</label>
                  <input
                    type="url"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="e.g. https://open.spotify.com/track/..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">YouTube Link</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      const id = e.target.value.includes("youtu.be") 
                        ? e.target.value.split("/").pop() || "" 
                        : new URLSearchParams(e.target.value.split("?")[1] || "").get("v") || "";
                      setYoutubeVideoId(id);
                    }}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cozy Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why does this track remind you of us?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                {/* Action Buttons */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-2"
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
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
