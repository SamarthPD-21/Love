"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Plus, Trash2, Calendar, Loader2, X, Heart, Plane, Gift, Star, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Milestone {
  _id: string;
  title: string;
  date: string;
  description?: string;
  icon?: string;
  photos?: string[];
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

const iconsMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  plane: Plane,
  gift: Gift,
  star: Star,
};

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [icon, setIcon] = useState("heart");
  const [creating, setCreating] = useState(false);

  const fetchMilestones = async () => {
    try {
      const response = await api.get("/timeline");
      if (response.data.success) {
        setMilestones(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch milestones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchMilestones());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    setError("");
    setCreating(true);

    try {
      const response = await api.post("/timeline", {
        title,
        description,
        date,
        icon,
      });

      if (response.data.success) {
        setMilestones((prev) => [...prev, response.data.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setDate("");
        setIcon("heart");
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.error || "Failed to create milestone");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await api.delete(`/timeline/${id}`);
      setMilestones((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error("Failed to delete milestone:", err);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary animate-pulse-soft" /> Our Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A vertical journal of our biggest moments, travels, and milestones 🌎
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/50 border border-border/50 rounded-3xl backdrop-blur-sm text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-3 animate-float" />
          <h3 className="text-lg font-bold text-foreground">No milestones yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Start documenting your story! Add details about your first meeting, dates, or anniversaries.
          </p>
        </div>
      ) : (
        <div className="relative flex-1 max-w-3xl mx-auto w-full px-4">
          {/* Vertical Connecting Track */}
          <div className="absolute left-[39px] sm:left-1/2 top-4 bottom-4 w-0.5 bg-border -translate-x-1/2" />

          {/* Milestones list */}
          <div className="space-y-12">
            {milestones.map((milestone, idx) => {
              const IconComponent = iconsMap[milestone.icon || "heart"] || Heart;
              const isEven = idx % 2 === 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ type: "spring", duration: 0.6 }}
                  key={milestone._id}
                  className={cn(
                    "flex flex-row items-center w-full relative",
                    isEven ? "sm:flex-row-reverse" : ""
                  )}
                >
                  {/* Left/Right Card spacing */}
                  <div className="w-14 sm:w-1/2" />

                  {/* Icon Node */}
                  <div className="absolute left-6 sm:left-1/2 w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center -translate-x-1/2 z-10 shadow-md">
                    <IconComponent className="w-5 h-5 text-primary fill-primary/10" />
                  </div>

                  {/* Card Container */}
                  <div className="flex-1 sm:w-1/2 pl-6 sm:pl-12 sm:pr-12">
                    <motion.div
                      className="card-cozy p-6 relative group"
                      whileHover={{ scale: 1.01, y: -2 }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 py-1 px-2.5 rounded-full">
                          {format(new Date(milestone.date), "MMMM d, yyyy")}
                        </span>
                        <button
                          onClick={() => handleDelete(milestone._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-foreground leading-snug">
                        {milestone.title}
                      </h3>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
                <Sparkles className="w-5 h-5 text-primary" /> Add Milestone
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Day We Met, Our First Flight"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this beautiful moment..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Choose Icon</label>
                  <div className="flex gap-4">
                    {Object.keys(iconsMap).map((key) => {
                      const IconNode = iconsMap[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setIcon(key)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer",
                            icon === key
                              ? "bg-primary border-primary text-white"
                              : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <IconNode className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </span>
                  ) : (
                    "Save Milestone"
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
