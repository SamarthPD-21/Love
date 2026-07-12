"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flower2, Plus, Trash2, Heart, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Gratitude {
  _id: string;
  content: string;
  likes: string[];
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function GratitudePage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Gratitude[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await api.get("/gratitude");
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load gratitude items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const response = await api.post("/gratitude", { content });
      if (response.data.success) {
        setItems((prev) => [response.data.data, ...prev]);
        setContent("");
      }
    } catch (err) {
      console.error("Failed to add gratitude item:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const response = await api.post(`/gratitude/${id}/like`);
      if (response.data.success) {
        setItems((prev) =>
          prev.map((item) => (item._id === id ? response.data.data : item))
        );
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gratitude item?")) return;
    try {
      await api.delete(`/gratitude/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Flower2 className="w-8 h-8 text-primary" /> Gratitude Board
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A cozy, private board where we share the little things we appreciate about each other 🌼
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Composer (Left Panel) */}
        <div className="bg-card/80 border border-border/50 backdrop-blur-md rounded-3xl p-6 shadow-xl">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">
            Express Thanks
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are you grateful for today? e.g. Grateful that you listend to me complain about work..."
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-primary hover:bg-primary-hover text-white disabled:opacity-60 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </span>
              ) : (
                "Post to Board 🌼"
              )}
            </button>
          </form>
        </div>

        {/* Board Display (Right/Middle Panel) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-2">
            Shared board
          </h3>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 rounded-3xl border border-border/50 bg-card/50 text-center">
              <Flower2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2 animate-float" />
              <p className="text-xs text-muted-foreground italic">No posts on the gratitude board yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {items.map((item) => {
                  const hasLiked = user?._id ? item.likes.includes(user._id) : false;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="card-cozy p-5 flex flex-col justify-between"
                      key={item._id}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary uppercase">
                              {item.userId.name.slice(0, 1)}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {item.userId.name}
                            </span>
                          </div>

                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                            {format(new Date(item.createdAt), "MMM d")}
                          </span>
                        </div>

                        <p className="handwritten text-2xl text-foreground leading-relaxed mb-4">
                          &ldquo;{item.content}&rdquo;
                        </p>
                      </div>

                      <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(item._id)}
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-lg transition-all cursor-pointer",
                            hasLiked
                              ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-100 dark:border-rose-900/30"
                              : "text-zinc-400 hover:text-rose-500"
                          )}
                        >
                          <Heart className={cn("w-3.5 h-3.5", hasLiked ? "fill-rose-500 text-rose-500" : "")} />
                          <span>{item.likes.length || ""} Like</span>
                        </button>

                        {/* Delete Button */}
                        {user?._id === item.userId._id && (
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
