"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, Edit2, Loader2, X, Heart, Smile } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface JournalEntry {
  _id: string;
  title: string;
  content: string;
  mood: "loved" | "cozy" | "happy" | "excited" | "thoughtful";
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

const moodEmojis: Record<string, string> = {
  loved: "❤️",
  cozy: "☕",
  happy: "☀️",
  excited: "✨",
  thoughtful: "🌙",
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<"loved" | "cozy" | "happy" | "excited" | "thoughtful">("cozy");
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const response = await api.get("/journal");
      if (response.data.success) {
        setEntries(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load journal entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/journal", {
        title,
        content,
        mood,
      });

      if (response.data.success) {
        setEntries((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setContent("");
        setMood("cozy");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this journal entry?")) return;
    try {
      await api.delete(`/journal/${id}`);
      setEntries((prev) => prev.filter((entry) => entry._id !== id));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" /> Our Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write down thoughts, memories, logs, or quick notes for each other to read 📝
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Grid of Journal logs */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/50 border border-border/50 rounded-3xl backdrop-blur-sm text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-foreground">No journal logs</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Write down your first entry today! Tell them how much you love them or write about your week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {entries.map((entry) => (
            <motion.div
              layout
              key={entry._id}
              className="card-cozy p-6 flex flex-col justify-between relative overflow-hidden"
              whileHover={{ y: -4 }}
            >
              {/* Mood Badge absolute top right */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-sm" title={`Mood: ${entry.mood}`}>
                  {moodEmojis[entry.mood]}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 py-1 px-2.5 rounded-full mb-3 inline-block">
                  {format(new Date(entry.createdAt), "PP")}
                </span>

                <h3 className="text-lg font-bold text-foreground leading-tight mb-3">
                  {entry.title}
                </h3>

                <p className="handwritten text-2xl text-foreground leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </p>
              </div>

              <div className="border-t border-border/60 pt-4 flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary uppercase">
                    {entry.userId.name.slice(0, 1)}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Written by {entry.userId.name}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(entry._id, e)}
                  className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
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
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-primary" /> New Journal Entry
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Entry Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. A Cozy Evening, Missing You Extra Today"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mood</label>
                  <div className="flex gap-2">
                    {(Object.keys(moodEmojis) as Array<"loved" | "cozy" | "happy" | "excited" | "thoughtful">).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-xs font-semibold capitalize flex items-center gap-1.5 cursor-pointer transition-all",
                          mood === m
                            ? "bg-primary border-primary text-white"
                            : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span>{moodEmojis[m]}</span>
                        <span className="hidden sm:inline">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Story</label>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your thoughts..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Publish Entry"
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
