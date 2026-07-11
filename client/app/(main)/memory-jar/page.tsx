"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Plus, Trash2, Loader2, X, Heart, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface JarNote {
  _id: string;
  content: string;
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function MemoryJarPage() {
  const [notes, setNotes] = useState<JarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const { playSound } = useSoundEffects();

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNote, setDrawnNote] = useState<JarNote | null>(null);

  const fetchNotes = async () => {
    try {
      const response = await api.get("/memory-jar");
      if (response.data.success) {
        setNotes(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch jar notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setCreating(true);

    try {
      const response = await api.post("/memory-jar", { content });
      if (response.data.success) {
        playSound("success");
        setNotes((prev) => [response.data.data, ...prev]);
        setContent("");
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to add note to jar:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDraw = async () => {
    if (notes.length === 0) return;
    playSound("whoosh");
    setIsDrawing(true);
    setDrawnNote(null);

    // Synthetic delay for the shake animation
    setTimeout(async () => {
      try {
        const response = await api.get("/memory-jar/draw");
        if (response.data.success) {
          playSound("chime");
          setDrawnNote(response.data.data);
        }
      } catch (err) {
        console.error("Failed to draw note:", err);
      } finally {
        setIsDrawing(false);
      }
    }, 1200);
  };

  const handleSelectNote = (note: JarNote) => {
    playSound("chime");
    setDrawnNote(note);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remove this note from the jar?")) return;
    try {
      playSound("tap");
      await api.delete(`/memory-jar/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      if (drawnNote?._id === id) setDrawnNote(null);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Archive className="w-8 h-8 text-primary animate-pulse-soft" /> Memory Jar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop little notes in our virtual jar. Shake it to draw a random note whenever you miss them! 🫙
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Drop a Note
        </button>
      </div>

      {/* Main Area: Jar Visual & Drawn Note display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Left/Middle: The Glass Jar */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-8 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl relative overflow-hidden min-h-[420px] shadow-xl">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <div className="flex flex-col items-center max-w-sm w-full text-center space-y-8">
              {/* Shake Animations on the Jar */}
              <motion.div
                className="relative w-48 h-60 cursor-pointer select-none"
                animate={
                  isDrawing
                    ? {
                        rotate: [0, -12, 12, -12, 12, -6, 6, 0],
                        x: [0, -8, 8, -8, 8, 0],
                        y: [0, 4, -4, 4, -4, 0]
                      }
                    : {
                        y: [0, -6, 0],
                      }
                }
                transition={
                  isDrawing
                    ? { duration: 0.8, repeat: 1 }
                    : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }
                onClick={handleDraw}
              >
                {/* 3D Glass Jar Design */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/5 dark:from-white/10 dark:to-transparent border border-white/30 rounded-[30px] shadow-2xl backdrop-blur-xs overflow-hidden">
                  {/* Highlight lines to make it look glass-like */}
                  <div className="absolute top-0 left-4 right-4 h-[2px] bg-white/40" />
                  <div className="absolute top-2 left-2 bottom-2 w-[1px] bg-white/20" />
                  <div className="absolute inset-x-0 bottom-0 h-4 bg-primary/10" />
                </div>

                <svg
                  viewBox="0 0 100 120"
                  className="w-full h-full text-primary/30 fill-transparent drop-shadow-lg relative z-10"
                >
                  {/* Lid */}
                  <path d="M30 6 h40 v10 h-40 z" fill="var(--primary)" className="opacity-90" />
                  <path d="M32 16 h36 v4 h-36 z" fill="var(--primary-hover)" />
                  {/* Jar body */}
                  <path
                    d="M32 20 h36 c2 12 12 18 12 36 v48 c0 8 -8 12 -14 12 h-40 c-6 0 -14 -4 -14 -12 v-48 c0 -18 10 -24 12 -36 z"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-40"
                  />
                </svg>

                {/* Floating small hearts inside the jar */}
                <div className="absolute inset-0 top-20 bottom-8 left-8 right-8 overflow-hidden flex flex-wrap items-center justify-center gap-2 opacity-90 pointer-events-none z-20">
                  {notes.map((note, i) => (
                    <motion.div
                      key={note._id}
                      animate={{
                        y: [0, Math.sin(i) * 5, 0],
                        x: [0, Math.cos(i) * 3, 0],
                        rotate: [0, i % 2 === 0 ? 15 : -15, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
                      className="w-6 h-6 bg-gradient-to-br from-primary/30 to-accent/30 dark:from-primary/45 dark:to-accent/45 rounded-full border border-primary/40 flex items-center justify-center text-[11px] shadow-sm"
                    >
                      📜
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {notes.length} Scrolls of Love
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Shake the jar to pick a random scroll, or tap any scroll in the chest below to open it!
                </p>
              </div>

              <button
                disabled={notes.length === 0 || isDrawing}
                onClick={handleDraw}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                <RefreshCw className={cn("w-4 h-4", isDrawing ? "animate-spin" : "")} />
                Draw a Scroll 📜
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Drawn Note Display */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Heart className="w-4 h-4 text-primary fill-primary" /> Unfolded Scroll
          </h3>

          <AnimatePresence mode="wait">
            {drawnNote ? (
              <motion.div
                key={drawnNote._id}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex-1 flex flex-col justify-between p-6 bg-[#FCF8F2] dark:bg-zinc-950 border-2 border-amber-200/80 dark:border-zinc-800 rounded-3xl relative overflow-hidden text-center shadow-lg"
              >
                {/* Scroll border style decoration */}
                <div className="absolute inset-y-0 left-2 w-[1px] border-l border-dashed border-amber-300" />
                <div className="absolute inset-y-0 right-2 w-[1px] border-r border-dashed border-amber-300" />

                <div className="absolute top-0 right-0 p-3 flex gap-1 z-10">
                  <button
                    onClick={() => handleDelete(drawnNote._id, e as any)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDrawnNote(null)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-10 flex flex-col items-center">
                  <motion.span 
                    className="text-4xl mb-4"
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    📜
                  </motion.span>
                  <p className="handwritten text-2xl sm:text-3xl leading-relaxed text-zinc-900 dark:text-zinc-200 italic px-2">
                    &ldquo;{drawnNote.content}&rdquo;
                  </p>
                </div>

                <div className="border-t border-amber-200/60 dark:border-zinc-800 pt-4 text-left flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase">
                    {drawnNote.userId.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      Dropped by {drawnNote.userId.name}
                    </p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                      {format(new Date(drawnNote.createdAt), "PPP")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center"
              >
                <Archive className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3 animate-float" />
                <p className="text-xs text-muted-foreground italic max-w-[200px] leading-relaxed">
                  Shake the jar or pick a scroll from history to read a cozy note from your partner.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Jar Scrolls History Chest */}
      {notes.length > 0 && (
        <div className="mt-8 bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xs p-6 rounded-3xl shadow-md">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-primary" /> Jar Chest History ({notes.length})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {notes.map((note) => (
              <button
                key={note._id}
                onClick={() => handleSelectNote(note)}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 active:scale-95 group",
                  drawnNote?._id === note._id 
                    ? "bg-primary/10 border-primary text-primary" 
                    : "bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📜</span>
                <span className="text-[9px] font-bold uppercase tracking-wider block">
                  {format(new Date(note.createdAt), "MMM d")}
                </span>
                <span className="text-[8px] opacity-70 block truncate w-full max-w-[80px] mt-0.5">
                  {note.userId.name}
                </span>
              </button>
            ))}
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
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" /> Drop a Note in the Jar
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Note Content</label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a sweet reminder, cute memory, or comforting message..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating || !content.trim()}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Dropping...
                    </span>
                  ) : (
                    "Drop Note 🫙"
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
