"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Trash2, Calendar, CheckSquare, Square, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Dream {
  _id: string;
  title: string;
  description?: string;
  category: "travel" | "fun" | "house" | "career" | "general";
  isCompleted: boolean;
  targetDate?: string;
}

export default function DreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  // Filter category
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"travel" | "fun" | "house" | "career" | "general">("general");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDreams = async () => {
    try {
      const response = await api.get("/dreams");
      if (response.data.success) {
        setDreams(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load dreams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDreams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/dreams", {
        title,
        description,
        category,
        targetDate: targetDate || undefined,
      });

      if (response.data.success) {
        setDreams((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setCategory("general");
        setTargetDate("");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add dream");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCompleted = async (id: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/dreams/${id}`, {
        isCompleted: !currentStatus,
      });
      if (response.data.success) {
        setDreams((prev) =>
          prev.map((d) => (d._id === id ? response.data.data : d))
        );
      }
    } catch (err) {
      console.error("Failed to toggle dream status:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this dream goal?")) return;
    try {
      await api.delete(`/dreams/${id}`);
      setDreams((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Failed to delete dream:", err);
    }
  };

  // Stats calculation
  const completedCount = dreams.filter((d) => d.isCompleted).length;
  const totalCount = dreams.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredDreams = dreams.filter(
    (d) => activeFilter === "all" || d.category === activeFilter
  );

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" /> Our Dreams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bucket lists, travel maps, and shared goals for our future together 🎯
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Progress Bar Header Card */}
      <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Bucket List Completed
            </span>
            <span className="text-sm font-bold text-primary">{progressPercent}% ({completedCount}/{totalCount})</span>
          </div>
          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-950 rounded-full overflow-hidden border border-zinc-200/50 dark:border-zinc-850">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {["all", "travel", "fun", "house", "career", "general"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer",
                activeFilter === cat
                  ? "bg-primary border-primary text-white"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredDreams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl backdrop-blur-sm text-center">
          <Target className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No dreams found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Try creating a dream under the &ldquo;{activeFilter}&rdquo; category!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDreams.map((dream) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "card-cozy p-6 flex flex-col justify-between cursor-pointer border transition-all",
                  dream.isCompleted ? "bg-zinc-50/50 dark:bg-zinc-955/20 border-emerald-500/20" : ""
                )}
                onClick={() => handleToggleCompleted(dream._id, dream.isCompleted)}
                key={dream._id}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 py-1 px-2.5 rounded-full">
                      {dream.category}
                    </span>
                    <button
                      onClick={(e) => handleDelete(dream._id, e)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {dream.isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-400 shrink-0" />
                    )}
                    <h3 className={cn(
                      "font-bold text-zinc-950 dark:text-zinc-50 text-base leading-snug",
                      dream.isCompleted ? "line-through text-muted-foreground" : ""
                    )}>
                      {dream.title}
                    </h3>
                  </div>

                  {dream.description && (
                    <p className={cn(
                      "text-xs text-muted-foreground mt-2 pl-8 leading-relaxed",
                      dream.isCompleted ? "line-through opacity-60" : ""
                    )}>
                      {dream.description}
                    </p>
                  )}
                </div>

                {dream.targetDate && (
                  <div className="mt-4 pl-8 flex items-center gap-1.5 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Target: {format(new Date(dream.targetDate), "PP")}</span>
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
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-primary" /> Add Future Goal
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Goal Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Travel to Switzerland, Buy an apartment"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="How are we going to make this dream happen?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 cursor-pointer"
                    >
                      <option value="general">General</option>
                      <option value="travel">Travel</option>
                      <option value="fun">Fun</option>
                      <option value="house">House</option>
                      <option value="career">Career</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Target Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !title}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </span>
                  ) : (
                    "Save Goal"
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
