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

    // Add a synthetic delay for the shake animation!
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Archive className="w-8 h-8 text-primary" /> Memory Jar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop little notes in our virtual jar. Shake it to draw a random note whenever you miss them! 🫙
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Drop a Note
        </button>
      </div>

      {/* Main Area: Jar Visual & Drawn Note display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Left/Middle: The Glass Jar */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-8 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl relative overflow-hidden min-h-[420px]">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <div className="flex flex-col items-center max-w-sm w-full text-center space-y-6">
              {/* Shake Animations on the Jar */}
              <motion.div
                className="relative w-44 h-56 cursor-pointer select-none"
                animate={
                  isDrawing
                    ? {
                        rotate: [0, -10, 10, -10, 10, -5, 5, 0],
                        x: [0, -5, 5, -5, 5, 0],
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
                {/* SVG Jar Outline */}
                <svg
                  viewBox="0 0 100 120"
                  className="w-full h-full text-zinc-300 dark:text-zinc-700 fill-zinc-100/10 dark:fill-zinc-950/10 drop-shadow-md"
                >
                  {/* Lid */}
                  <path d="M30 10 h40 v8 h-40 z" fill="#E8A0BF" />
                  {/* Jar body */}
                  <path
                    d="M32 18 h36 c2 12 12 18 12 36 v50 c0 6 -6 10 -12 10 h-44 c-6 0 -12 -4 -12 -10 v-50 c0 -18 10 -24 12 -36 z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Reflection highlights */}
                  <path d="M22 45 c0 -12 6 -16 8 -22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </svg>

                {/* Floating small hearts inside the jar */}
                <div className="absolute inset-0 top-16 bottom-6 left-6 right-6 overflow-hidden flex flex-wrap items-center justify-center gap-1.5 opacity-80 pointer-events-none">
                  {notes.slice(0, Math.min(notes.length, 12)).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, Math.sin(i) * 3, 0],
                        rotate: [0, i % 2 === 0 ? 10 : -10, 0],
                      }}
                      transition={{ duration: 3 + (i % 2), repeat: Infinity, ease: "easeInOut" }}
                      className="w-5 h-5 bg-primary/20 dark:bg-primary/30 rounded-full border border-primary/40 flex items-center justify-center text-[10px]"
                    >
                      📜
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {notes.length} Notes in Jar
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click the jar above to shake it and draw a random note from your partner!
                </p>
              </div>

              <button
                disabled={notes.length === 0 || isDrawing}
                onClick={handleDraw}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className={cn("w-4 h-4", isDrawing ? "animate-spin" : "")} />
                Draw a Scroll
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Drawn Note Display / List */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Archive className="w-4 h-4 text-primary" /> Drawn Note
          </h3>

          <AnimatePresence mode="wait">
            {drawnNote ? (
              <motion.div
                key="drawn"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="flex-1 flex flex-col justify-between p-6 bg-[#FCF8F2] dark:bg-zinc-950 border-2 border-primary/20 dark:border-zinc-800 rounded-3xl relative overflow-hidden text-center shadow-md"
              >
                <div className="absolute top-0 right-0 p-3">
                  <button
                    onClick={() => setDrawnNote(null)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-8 flex flex-col items-center">
                  <span className="text-4xl mb-4 animate-float">📜</span>
                  <p className="handwritten text-2xl sm:text-3xl leading-relaxed text-zinc-900 dark:text-zinc-50 italic">
                    &ldquo;{drawnNote.content}&rdquo;
                  </p>
                </div>

                <div className="border-t border-primary/10 pt-4 text-left flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase">
                    {drawnNote.userId.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      Written by {drawnNote.userId.name}
                    </p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                      {format(new Date(drawnNote.createdAt), "PP")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center"
              >
                <Archive className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-muted-foreground italic max-w-[200px]">
                  Shake the jar or press draw to unfold a paper scroll!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
