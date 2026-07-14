"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Plus, Trash2, CheckCircle2, Star, Loader2, X, AlertCircle, Play, Users, Link as LinkIcon } from "lucide-react";
import api from "@/lib/api";
import { cn, getRelationshipId } from "@/lib/utils";
import { format } from "date-fns";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";

interface Movie {
  _id: string;
  title: string;
  type: "movie" | "show";
  status: "watchlist" | "watched";
  rating?: number;
  review?: string;
  watchLink?: string;
  createdAt: string;
}

export default function MoviesPage({ onStartCinema }: { onStartCinema?: () => void }) {
  const { user } = useAuthStore();
  const socket = getSocket();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const handleStartWatchTogether = (movie: Movie) => {
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
    }
  };

  // Filter tab
  const [activeTab, setActiveTab] = useState<"watchlist" | "watched">("watchlist");

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "show">("movie");
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
    Promise.resolve().then(() => fetchMovies());
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/movies", {
        title,
        type,
        watchLink: watchLink.trim() || undefined,
        status: "watchlist",
      });

      if (response.data.success) {
        setMovies((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setType("movie");
        setWatchLink("");
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.error || "Failed to add movie");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWatchLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLinkMovieId) return;
    try {
      const response = await api.put(`/movies/${editingLinkMovieId}`, {
        watchLink: editLinkValue.trim() || null,
      });
      if (response.data.success) {
        setMovies((prev) =>
          prev.map((m) => (m._id === editingLinkMovieId ? response.data.data : m))
        );
        setEditingLinkMovieId(null);
        setEditLinkValue("");
      }
    } catch (err) {
      console.error("Failed to update watch link:", err);
    }
  };

  const handleToggleStatus = async (movie: Movie) => {
    if (movie.status === "watchlist") {
      // Prompt review modal
      setEditingMovieId(movie._id);
      setReviewText("");
      setRatingVal(5);
    } else {
      // Toggle back to watchlist
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
    if (!confirm("Are you sure you want to delete this watchlist item?")) return;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredMovies.map((movie) => (
              <motion.div
                layout
                key={movie._id}
                className="card-cozy p-6 flex flex-col justify-between"
                whileHover={{ y: -4 }}
              >
                <div>
                  {/* Card Header: Metadata on left, Actions on right */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="self-start text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 py-0.5 px-2 rounded-full">
                        {movie.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Added: {format(new Date(movie.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Mark Watched Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(movie)}
                        title={movie.status === "watched" ? "Mark as Unwatched" : "Mark as Watched"}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all cursor-pointer",
                          movie.status === "watched"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                            : "bg-zinc-800/20 border-zinc-700/30 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Edit Link Button */}
                      <button
                        onClick={() => {
                          setEditingLinkMovieId(movie._id);
                          setEditLinkValue(movie.watchLink || "");
                        }}
                        title="Edit Watch Link"
                        className="p-1.5 rounded-lg bg-zinc-800/20 border border-zinc-700/30 text-zinc-400 hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all cursor-pointer"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(movie._id, e)}
                        title="Delete from Watchlist"
                        className="p-1.5 rounded-lg bg-zinc-800/20 border border-zinc-700/30 text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground text-base leading-tight mt-1">
                    {movie.title}
                  </h3>

                  {movie.status === "watched" && movie.rating && (
                    <div className="flex gap-0.5 mt-2 mb-3">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={cn(
                            "w-3.5 h-3.5",
                            idx < (movie.rating || 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {movie.status === "watched" && movie.review && (
                    <p className="handwritten text-base text-foreground bg-background border border-border p-3 rounded-xl mb-4 leading-relaxed italic">
                      &ldquo;{movie.review}&rdquo;
                    </p>
                  )}
                </div>

                {/* Bottom Section: Primary Streaming Actions */}
                {movie.status === "watchlist" && (
                  <div className="border-t border-border/40 pt-4 mt-4 flex gap-2">
                    {movie.watchLink ? (
                      <>
                        <a
                          href={movie.watchLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            try {
                              const audio = new Audio("/sounds/tap.mp3");
                              audio.volume = 0.2;
                              audio.play().catch(() => {});
                            } catch (e) {}
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Watch Now</span>
                        </a>

                        <button
                          onClick={() => handleStartWatchTogether(movie)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 active:scale-95"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Together</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartWatchTogether(movie)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 active:scale-95"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Watch Together</span>
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <Film className="w-5 h-5 text-primary" /> Add Watchlist Item
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. La La Land, Succession"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setType("movie")}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all",
                        type === "movie"
                          ? "bg-primary border-primary text-white"
                          : "bg-muted/50 border-border/50 text-muted-foreground"
                      )}
                    >
                      🎬 Movie
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("show")}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all",
                        type === "show"
                          ? "bg-primary border-primary text-white"
                          : "bg-muted/50 border-border/50 text-muted-foreground"
                      )}
                    >
                      📺 TV Show
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custom Watch Link (Optional)</label>
                  <input
                    type="url"
                    value={watchLink}
                    onChange={(e) => setWatchLink(e.target.value)}
                    placeholder="e.g. https://vidsrc.to/embed/movie/tt..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Leave blank to let MovieBot search automatically, or paste your own streaming/embed URL.
                  </p>
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
                    "Save to List"
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditingMovieId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setEditingMovieId(null)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <AlertCircle className="w-5 h-5 text-primary" /> Movie Review Note
              </h3>

              <form onSubmit={handleSaveReview} className="space-y-4">
                {/* Stars selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rating</label>
                  <div className="flex gap-2 text-2xl">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRatingVal(idx + 1)}
                        className="p-1 cursor-pointer transition-transform active:scale-125"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-colors",
                            idx < ratingVal ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cozy Review</label>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write your review notes (e.g. loved the soundtrack, cried three times!)"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingReview}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {updatingReview ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save Review"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Watch Link Modal */}
      <AnimatePresence>
        {editingLinkMovieId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditingLinkMovieId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setEditingLinkMovieId(null)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <LinkIcon className="w-5 h-5 text-primary" /> Edit Watch Link
              </h3>

              <form onSubmit={handleSaveWatchLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Streaming/Embed URL</label>
                  <input
                    type="url"
                    required
                    value={editLinkValue}
                    onChange={(e) => setEditLinkValue(e.target.value)}
                    placeholder="e.g. https://vidsrc.to/embed/movie/tt..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Enter the streaming link, embed URL, or direct video source link for this movie.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  Save Link
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
