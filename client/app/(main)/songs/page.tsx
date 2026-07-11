"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Plus, Trash2, ExternalLink, Loader2, X, Play, Heart } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Song {
  _id: string;
  title: string;
  artist: string;
  url: string;
  notes?: string;
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    fetchSongs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist || !url) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/songs", {
        title,
        artist,
        url,
        notes: notes || undefined,
      });

      if (response.data.success) {
        setSongs((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setArtist("");
        setUrl("");
        setNotes("");
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
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  // Helper to resolve embed links
  const getEmbedUrl = (rawUrl: string) => {
    try {
      const urlObj = new URL(rawUrl);
      if (urlObj.hostname.includes("spotify.com")) {
        // e.g. /track/12345 -> /embed/track/12345
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
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
    } catch (e) {
      // invalid url
    }
    return null;
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Music className="w-8 h-8 text-primary" /> Our Playlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Songs that remind us of each other, our road trips, and cozy nights 🎵
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl backdrop-blur-sm text-center">
          <Music className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No songs yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Add your favorite song, a track you both danced to, or Spotify playlists!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {songs.map((song) => {
            const embed = getEmbedUrl(song.url);
            return (
              <motion.div
                layout
                key={song._id}
                className="card-cozy p-6 flex flex-col justify-between"
                whileHover={{ y: -4, scale: 1.005 }}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-base leading-tight">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{song.artist}</p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <a
                        href={song.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/5 transition-all"
                        title="Open external link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
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
                    <p className="handwritten text-xl text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 p-3 rounded-xl mb-4 leading-relaxed">
                      &ldquo;{song.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Embed player if valid */}
                {embed ? (
                  <div className="mt-2 rounded-xl overflow-hidden bg-black/5 dark:bg-black/25">
                    <iframe
                      src={embed}
                      width="100%"
                      height={embed.includes("spotify.com") ? "80" : "180"}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="border-0 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="mt-2 py-3 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between text-xs text-muted-foreground">
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
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-6">
                <Music className="w-5 h-5 text-primary" /> Add Song to Playlist
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Song Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lover"
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Artist</label>
                    <input
                      type="text"
                      required
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="e.g. Taylor Swift"
                      className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Spotify / Youtube URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste track share link"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Cozy Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why does this track remind you of us?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </span>
                  ) : (
                    "Add Song"
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
