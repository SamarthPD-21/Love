"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, Plus, Trash2, CheckCircle2, Star, Loader2, X, 
  AlertCircle, Play, Users, Link as LinkIcon, Tv, 
  Settings, ChevronDown, Check, Image as ImageIcon
} from "lucide-react";
import api from "@/lib/api";
import { cn, getRelationshipId } from "@/lib/utils";
import { format } from "date-fns";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";

const STREAM_SOURCES = [
  { key: 'cineby', label: 'Cineby.at', emoji: '🌟', recommended: true },
  { key: 'default', label: '1HD.to', emoji: '🎬' },
  { key: 'miruro', label: 'Miruro (Anime)', emoji: '🌸' },
  { key: 'bflix', label: 'BFlix', emoji: '🅱️' },
  { key: 'vidsrc_to', label: 'VidSrc.to', emoji: '⚡' },
  { key: 'vidsrc_me', label: 'VidSrc.me', emoji: '⚡' },
  { key: 'vidsrcme_ru', label: 'VidSrcMe.ru', emoji: '🇷🇺' },
  { key: 'vidsrc_xyz', label: 'VidSrc.xyz', emoji: '⚡' },
  { key: 'two_embed', label: '2Embed', emoji: '🎞️' },
  { key: 'multiembed', label: 'MultiEmbed', emoji: '🔗' },
  { key: 'embedsu', label: 'Embed.su', emoji: '🎥' },
  { key: 'autoembed', label: 'AutoEmbed', emoji: '🤖' },
  { key: 'smashystream', label: 'SmashyStream', emoji: '💥' },
] as const;

function getStreamUrlForSource(sourceKey: string, title: string, type: "movie" | "show"): string {
  const titleEnc = encodeURIComponent(title);
  const mType = type === "movie" ? "movie" : "tv";
  if (sourceKey === "cineby") return `https://www.cineby.at/${mType}/${titleEnc}`;
  if (sourceKey === "miruro") return `https://www.miruro.ru/search?query=${titleEnc}`;
  if (sourceKey === "bflix") return `https://bflixs.us/${mType}/${titleEnc}`;
  if (sourceKey === "vidsrc_to") return `https://vidsrc.to/embed/${mType}/${titleEnc}`;
  if (sourceKey === "vidsrc_me") return `https://vidsrc.me/embed/${mType}/${titleEnc}`;
  if (sourceKey === "vidsrcme_ru") return `https://vidsrcme.ru/embed/${mType}/${titleEnc}`;
  if (sourceKey === "vidsrc_xyz") return `https://vidsrc.xyz/embed/${mType}/${titleEnc}`;
  if (sourceKey === "two_embed") return `https://2embed.cc/embed/${titleEnc}`;
  if (sourceKey === "multiembed") return `https://multiembed.mov/directstream.php?video_id=${titleEnc}&tmdb=0`;
  if (sourceKey === "embedsu") return `https://embed.su/embed/${mType}/${titleEnc}`;
  if (sourceKey === "autoembed") return `https://player.autoembed.cc/embed/${mType}/${titleEnc}`;
  if (sourceKey === "smashystream") return `https://player.smashy.stream/${mType}/${titleEnc}`;
  return `https://1hd.art/search?keyword=${titleEnc}`;
}

async function fetchPosterForTitle(title: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api2.imdb4.shop/api/search2/${encodeURIComponent(title)}?page=0`);
    if (res.ok) {
      const data = await res.json();
      const results = data.results || [];
      if (results.length > 0 && results[0].poster_path) {
        const path = results[0].poster_path;
        if (path.startsWith("http")) return path;
        return `https://image.tmdb.org/t/p/w500${path.startsWith("/") ? "" : "/"}${path}`;
      }
    }
  } catch {}
  try {
    const omdbRes = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=4a3b711b`);
    if (omdbRes.ok) {
      const omdbData = await omdbRes.json();
      if (omdbData.Poster && omdbData.Poster !== "N/A") {
        return omdbData.Poster;
      }
    }
  } catch {}
  return null;
}

interface Movie {
  _id: string;
  title: string;
  type: "movie" | "show";
  status: "watchlist" | "watched";
  rating?: number;
  review?: string;
  watchLink?: string;
  posterUrl?: string;
  createdAt: string;
}

export default function MoviesPage({ onStartCinema }: { onStartCinema?: () => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const handleStartWatchTogether = (movie: Movie) => {
    const socket = getSocket();
    if (!socket || !user || !user.relationshipId) return;
    socket.emit("start_cinema", {
      relationshipId: getRelationshipId(user.relationshipId),
      movieId: movie._id,
      movieTitle: movie.title,
      movieType: movie.type,
      watchLink: movie.watchLink,
    });
    if (onStartCinema) {
      onStartCinema();
    } else {
      router.push("/cinema");
    }
  };

  // Filter tab
  const [activeTab, setActiveTab] = useState<"watchlist" | "watched">("watchlist");

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "show">("movie");
  const [linkType, setLinkType] = useState<"auto" | "custom" | "gdrive">("auto");
  const [watchLink, setWatchLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Link State
  const [editingLinkMovieId, setEditingLinkMovieId] = useState<string | null>(null);
  const [editLinkValue, setEditLinkValue] = useState("");

  // Review Edit State
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [ratingVal, setRatingVal] = useState(5);
  const [updatingReview, setUpdatingReview] = useState(false);

  // Source Dropdown State
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMovies = async () => {
    try {
      const response = await api.get("/movies");
      if (response.data.success) {
        setMovies(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load movies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (!movies.length) return;
    movies.forEach(async (movie) => {
      if (!movie.posterUrl) {
        const poster = await fetchPosterForTitle(movie.title);
        if (poster) {
          setMovies((prev) =>
            prev.map((m) => (m._id === movie._id ? { ...m, posterUrl: poster } : m))
          );
          api.put(`/movies/${movie._id}`, { posterUrl: poster }).catch(() => {});
        }
      }
    });
  }, [movies.length]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMovieUpdated = (updatedMovie: Movie) => {
      setMovies((prev) =>
        prev.map((m) => (m._id === updatedMovie._id ? updatedMovie : m))
      );
    };

    socket.on("movie_updated", handleMovieUpdated);
    return () => {
      socket.off("movie_updated", handleMovieUpdated);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSourceDropdownOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/movies", {
        title,
        type,
        watchLink: linkType === "auto" ? undefined : watchLink.trim() || undefined,
        status: "watchlist",
      });

      if (response.data.success) {
        setMovies((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setType("movie");
        setLinkType("auto");
        setWatchLink("");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add movie");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWatchLink = async (e?: React.FormEvent, movieId?: string, link?: string) => {
    if (e) e.preventDefault();
    const targetId = movieId || editingLinkMovieId;
    const targetLink = link !== undefined ? link : editLinkValue;
    if (!targetId) return;
    try {
      const response = await api.put(`/movies/${targetId}`, {
        watchLink: targetLink.trim() || null,
      });
      if (response.data.success) {
        setMovies((prev) =>
          prev.map((m) => (m._id === targetId ? response.data.data : m))
        );
        if (targetId === editingLinkMovieId) {
          setEditingLinkMovieId(null);
          setEditLinkValue("");
        }
      }
    } catch (err) {
      console.error("Failed to update watch link:", err);
    }
  };

  const handleToggleStatus = async (movie: Movie) => {
    if (movie.status === "watchlist") {
      setEditingMovieId(movie._id);
      setReviewText("");
      setRatingVal(5);
    } else {
      try {
        const response = await api.put(`/movies/${movie._id}`, {
          status: "watchlist",
          rating: null,
          review: "",
        });
        if (response.data.success) {
          setMovies((prev) =>
            prev.map((m) => (m._id === movie._id ? response.data.data : m))
          );
        }
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovieId) return;
    setUpdatingReview(true);

    try {
      const response = await api.put(`/movies/${editingMovieId}`, {
        status: "watched",
        rating: ratingVal,
        review: reviewText,
      });

      if (response.data.success) {
        setMovies((prev) =>
          prev.map((m) => (m._id === editingMovieId ? response.data.data : m))
        );
        setEditingMovieId(null);
        setReviewText("");
        setRatingVal(5);
      }
    } catch (err) {
      console.error("Failed to save review:", err);
    } finally {
      setUpdatingReview(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/movies/${id}`);
      setMovies((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error("Failed to delete movie:", err);
    }
  };

  const filteredMovies = movies.filter((m) => m.status === activeTab);

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Full-screen Theater Date Experience Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 mb-8 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-primary/20 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-foreground text-sm sm:text-base font-display">
              Want a real movie date experience?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try the new immersive full-screen cinema hall with integrated side chat.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onStartCinema) onStartCinema();
            else router.push("/cinema");
          }}
          className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-2"
        >
          <span>Launch Full-screen Theater 🍿</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Film className="w-8 h-8 text-primary" /> Movie Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keep track of shows and movies we want to watch together, and review them! 🎬
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Movie/Show
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border/80 mb-6">
        <button
          onClick={() => setActiveTab("watchlist")}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 cursor-pointer",
            activeTab === "watchlist"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Watch Queue ({movies.filter((m) => m.status === "watchlist").length})
        </button>
        <button
          onClick={() => setActiveTab("watched")}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2 cursor-pointer",
            activeTab === "watched"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Already Watched ({movies.filter((m) => m.status === "watched").length})
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/50 border border-border/50 rounded-3xl backdrop-blur-sm text-center">
          <Film className="w-12 h-12 text-muted-foreground/30 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-foreground">Watchlist empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            {activeTab === "watchlist"
              ? "Add shows or movies you both want to watch on a rainy night!"
              : "Mark items as watched to leave review notes and star ratings!"}
          </p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          activeTab === "watchlist" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8"
        )}>
          <AnimatePresence mode="popLayout">
            {filteredMovies.map((movie) => {
              const isGdrive = movie.watchLink?.includes("drive.google.com");
              const hasLink = !!movie.watchLink;
              
              if (activeTab === "watchlist") {
                // Horizontal Card Layout for Watch Queue
                return (
                  <motion.div
                    layout
                    key={movie._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col sm:flex-row bg-card text-card-foreground border border-border/70 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 relative overflow-visible"
                  >
                    {/* Left side: Poster */}
                    <div className="relative w-full sm:w-40 shrink-0 aspect-[2/3] sm:aspect-auto sm:h-full bg-secondary/50 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden">
                      {movie.posterUrl ? (
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          onError={async (e) => {
                            const imgElement = e.currentTarget;
                            imgElement.onerror = null;
                            const newPoster = await fetchPosterForTitle(movie.title);
                            if (newPoster) {
                              imgElement.src = newPoster;
                              setMovies((prev) =>
                                prev.map((m) => (m._id === movie._id ? { ...m, posterUrl: newPoster } : m))
                              );
                            }
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center text-muted-foreground">
                          <Film className="w-10 h-10 opacity-40 mb-2" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60">No Poster</span>
                        </div>
                      )}
                      
                      {/* Status Badge Overlay */}
                      <div className="absolute top-2.5 left-2.5 bg-background/80 backdrop-blur-md border border-border/50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-md">
                        {isGdrive ? (
                          <><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /><span className="text-[9px] font-bold text-foreground">Google Drive</span></>
                        ) : hasLink ? (
                          <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] font-bold text-foreground">Stream Ready</span></>
                        ) : (
                          <><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] font-bold text-foreground">No Link</span></>
                        )}
                      </div>
                    </div>

                    {/* Right side: Content */}
                    <div className="flex flex-col flex-1 p-4 sm:p-5 justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            <span className="self-start text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 py-0.5 px-2 rounded-full border border-primary/20">
                              {movie.type}
                            </span>
                            <h3 className="font-extrabold text-foreground text-lg sm:text-xl leading-tight line-clamp-2">
                              {movie.title}
                            </h3>
                          </div>
                          
                          {/* Top Right Mini Actions Cluster */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Source Picker Dropdown */}
                            <div className="relative" ref={sourceDropdownOpen === movie._id ? dropdownRef : null}>
                              <button
                                onClick={() => setSourceDropdownOpen(sourceDropdownOpen === movie._id ? null : movie._id)}
                                className="p-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1"
                                title="Select Streaming Source"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </button>
                              
                              {sourceDropdownOpen === movie._id && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1 z-50 origin-top-right">
                                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Select Source</span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {STREAM_SOURCES.map(src => (
                                      <button
                                        key={src.key}
                                        onClick={() => {
                                          const generatedUrl = getStreamUrlForSource(src.key, movie.title, movie.type);
                                          handleSaveWatchLink(undefined, movie._id, generatedUrl);
                                          setSourceDropdownOpen(null);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent flex items-center justify-between group transition-colors cursor-pointer"
                                      >
                                        <span className="flex items-center gap-2">
                                          <span>{src.emoji}</span>
                                          <span>{src.label}</span>
                                        </span>
                                        {movie.watchLink?.includes(src.key) && <Check className="w-3.5 h-3.5 text-primary" />}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="p-1 border-t border-border/50 mt-1">
                                    <button
                                      onClick={() => {
                                        setEditingLinkMovieId(movie._id);
                                        setEditLinkValue(movie.watchLink || "");
                                        setSourceDropdownOpen(null);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary font-semibold hover:bg-primary/10 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5" />
                                      <span>Custom Link</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Mark Watched Button */}
                            <button
                              onClick={() => handleToggleStatus(movie)}
                              title="Mark as Watched"
                              className="p-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => handleDelete(movie._id, e)}
                              title="Delete"
                              className="p-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Added {format(new Date(movie.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>

                      {/* Clean Bottom Action Buttons (Equal Width & Perfectly Aligned) */}
                      <div className="flex items-center gap-2.5 pt-3 border-t border-border/60">
                        {hasLink ? (
                          <a
                            href={movie.watchLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 active:scale-95 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="truncate">Watch Solo</span>
                          </a>
                        ) : null}

                        <button
                          onClick={() => handleStartWatchTogether(movie)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span className="truncate">Together</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              } else {
                // Compact Poster Grid for Watched Tab
                return (
                  <motion.div
                    layout
                    key={movie._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[2/3] shadow-lg hover:shadow-2xl transition-all duration-300"
                  >
                    {movie.posterUrl ? (
                      <img 
                        src={movie.posterUrl} 
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black flex flex-col items-center justify-center text-zinc-600">
                        <Film className="w-12 h-12 opacity-50 mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-center px-4 leading-tight">{movie.title}</span>
                      </div>
                    )}
                    
                    {/* Watched Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <span className="text-[8px] font-bold text-primary uppercase tracking-wider bg-primary/20 py-0.5 px-2 rounded-full border border-primary/30 inline-block mb-1.5">
                          {movie.type}
                        </span>
                        <h3 className="font-bold text-white text-base leading-tight mb-2">
                          {movie.title}
                        </h3>
                        
                        {movie.rating ? (
                          <div className="flex gap-0.5 mb-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={cn(
                                  "w-3 h-3",
                                  idx < movie.rating!
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-white/20"
                                )}
                              />
                            ))}
                          </div>
                        ) : null}

                        {movie.review && (
                          <p className="text-[10px] text-zinc-300 line-clamp-3 italic opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 handwritten">
                            "{movie.review}"
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Top actions hidden by default, visible on hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => handleToggleStatus(movie)}
                        title="Mark as Unwatched"
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-primary transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(movie._id, e)}
                        title="Delete"
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-rose-500 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <Film className="w-5 h-5 text-primary" /> Add Watchlist Item
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Inception, The Office"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType("movie")}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2",
                        type === "movie"
                          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "bg-secondary/60 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      🎬 Movie
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("show")}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2",
                        type === "show"
                          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "bg-secondary/60 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      📺 TV Show
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Source Options</span>
                  </label>
                  
                  <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl mb-3">
                    <button type="button" onClick={() => setLinkType("auto")} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer", linkType === "auto" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>Auto</button>
                    <button type="button" onClick={() => setLinkType("custom")} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer", linkType === "custom" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>Custom URL</button>
                    <button type="button" onClick={() => setLinkType("gdrive")} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer", linkType === "gdrive" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>Google Drive</button>
                  </div>

                  <AnimatePresence mode="wait">
                    {linkType === "auto" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border/50">
                        🤖 <strong className="text-foreground">Auto Source:</strong> The app will automatically try to find a high-quality streaming source for you. You can change this later!
                      </motion.div>
                    )}
                    {linkType === "custom" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                        <input
                          type="url"
                          value={watchLink}
                          onChange={(e) => setWatchLink(e.target.value)}
                          placeholder="e.g. https://vidsrc.to/embed/..."
                          className="w-full px-4 py-3 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                      </motion.div>
                    )}
                    {linkType === "gdrive" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                        <input
                          type="url"
                          value={watchLink}
                          onChange={(e) => setWatchLink(e.target.value)}
                          placeholder="Paste Google Drive sharing link here..."
                          className="w-full px-4 py-3 rounded-xl text-sm bg-blue-500/5 border border-blue-500/30 text-foreground placeholder:text-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {error && (
                  <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 py-2 px-3 rounded-lg border border-rose-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-primary/20 mt-4 cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </span>
                  ) : (
                    "Save to Watchlist"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {editingMovieId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingMovieId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setEditingMovieId(null)}
                className="absolute right-4 top-4 p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Complete & Review
              </h3>

              <form onSubmit={handleSaveReview} className="space-y-5">
                <div className="space-y-2 flex flex-col items-center">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Rate this</label>
                  <div className="flex gap-1 py-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRatingVal(idx + 1)}
                        className="p-1.5 cursor-pointer transition-transform hover:scale-110 active:scale-90"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-colors duration-200",
                            idx < ratingVal ? "text-amber-400 fill-amber-400" : "text-zinc-700"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cozy Review Note</label>
                  <textarea
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write your review notes (e.g. loved the soundtrack, cried three times!)"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none handwritten"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingReview}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl shadow-emerald-500/20 mt-2 cursor-pointer"
                >
                  {updatingReview ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save & Mark Watched"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Watch Link Modal (Custom URL specific) */}
      <AnimatePresence>
        {editingLinkMovieId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingLinkMovieId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setEditingLinkMovieId(null)}
                className="absolute right-4 top-4 p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <LinkIcon className="w-5 h-5 text-amber-500" /> Custom Watch Link
              </h3>

              <form onSubmit={handleSaveWatchLink} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Streaming / Embed / Drive URL</label>
                  <input
                    type="url"
                    required
                    value={editLinkValue}
                    onChange={(e) => setEditLinkValue(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl text-sm bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">
                    Enter the exact URL you want to embed in the theater or open in a new tab.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-amber-500 text-black hover:bg-amber-600 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-amber-500/20 mt-2 cursor-pointer"
                >
                  Save Custom Link
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
