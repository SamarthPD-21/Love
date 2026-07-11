"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Plus, Trash2, Calendar, Clock, Loader2, X, Heart } from "lucide-react";
import api from "@/lib/api";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Countdown {
  _id: string;
  title: string;
  description?: string;
  targetDate: string;
  coverImage?: string;
}

export default function CountdownsPage() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCountdowns = async () => {
    try {
      const response = await api.get("/countdowns");
      if (response.data.success) {
        setCountdowns(response.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch countdowns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountdowns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetDate) return;
    setError("");
    setCreating(true);

    try {
      const response = await api.post("/countdowns", {
        title,
        description,
        targetDate,
        coverImage: coverImage || undefined,
      });

      if (response.data.success) {
        setCountdowns((prev) => [...prev, response.data.data].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()));
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setTargetDate("");
        setCoverImage("");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create countdown");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this countdown?")) return;
    try {
      await api.delete(`/countdowns/${id}`);
      setCountdowns((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to delete countdown:", err);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Timer className="w-8 h-8 text-primary" /> Countdowns
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Counting down the days to our next special moments ❤️
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : countdowns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl backdrop-blur-sm text-center">
          <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No active countdowns</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Start a countdown for your next trip, anniversary, or visit!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countdowns.map((countdown) => (
            <CountdownCard key={countdown._id} countdown={countdown} onDelete={handleDelete} />
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
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" /> New Countdown
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Next Hug, Trip to Beach"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what we are waiting for!"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Target Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </span>
                  ) : (
                    "Create Countdown"
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

// Countdown Card component to update timer dynamically
function CountdownCard({ countdown, onDelete }: { countdown: Countdown; onDelete: (id: string) => void }) {
  const timer = useCountdown(countdown.targetDate);

  return (
    <motion.div
      layout
      className="card-cozy p-6 flex flex-col justify-between"
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-lg leading-tight line-clamp-1">
            {countdown.title}
          </h3>
          <button
            onClick={() => onDelete(countdown._id)}
            className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
            title="Delete countdown"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {countdown.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
            {countdown.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-4">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{format(new Date(countdown.targetDate), "PPP p")}</span>
        </div>
      </div>

      <div>
        {timer.isExpired ? (
          <div className="py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-center font-bold text-sm">
            It&apos;s time! 🎉
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-3">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {timer.days}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Days</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {timer.hours}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Hours</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {timer.minutes}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Min</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 tabular-nums">
                {timer.seconds}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Sec</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
