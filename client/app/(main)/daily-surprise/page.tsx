"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Heart, Calendar, Lock, CheckCircle2, ChevronRight, MessageCircleHeart } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Surprise {
  title: string;
  detail: string;
  link?: string;
  unlockedAt?: string;
}

export default function DailySurprisePage() {
  const [surprise, setSurprise] = useState<Surprise | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(true);

  // History list of past days
  const [history, setHistory] = useState<{ day: string; title: string; detail: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dailyRes, historyRes] = await Promise.all([
          api.get("/daily"),
          api.get("/daily/history").catch(() => ({ data: { data: [] } })),
        ]);

        if (dailyRes.data.success) {
          setSurprise(dailyRes.data.surprise);
          setDailyMessage(dailyRes.data.message);
        }
        if (historyRes.data.success) {
          setHistory(historyRes.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load daily surprises:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" /> Daily Surprise
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A new capsule of happiness opens for you every single day 🌸
        </p>
      </div>

      {/* Main Interactive Surprise Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: The Surprise Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[360px]">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

            <AnimatePresence mode="wait">
              {!opened ? (
                <motion.div
                  key="closed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 flex flex-col items-center"
                >
                  <motion.div
                    className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-5xl cursor-pointer"
                    animate={{
                      y: [0, -8, 0],
                      rotate: [0, -3, 3, -3, 3, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                      ease: "easeInOut",
                    }}
                    onClick={() => setOpened(true)}
                  >
                    🎁
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Today&apos;s Gift Box</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                      Tap the gift box above to reveal today&apos;s handwritten message and surprise notes!
                    </p>
                  </div>
                  <button
                    onClick={() => setOpened(true)}
                    className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Open Gift
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="opened"
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="space-y-6 w-full text-left"
                >
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Opened Today</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {format(new Date(), "EEEE, MMMM d")}
                      </p>
                    </div>
                  </div>

                  {/* Daily Message */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <MessageCircleHeart className="w-3.5 h-3.5 fill-primary/10" /> Daily Love Note
                    </span>
                    <p className="handwritten text-2xl leading-relaxed text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5">
                      &ldquo;{dailyMessage || "You're the absolute highlight of my universe. ❤️"}&rdquo;
                    </p>
                  </div>

                  {/* Stable surprise detail */}
                  {surprise && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-2">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-primary" /> Special Surprise
                      </span>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">{surprise.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{surprise.detail}</p>
                      {surprise.link && (
                        <a
                          href={surprise.link}
                          className="inline-flex items-center text-xs font-semibold text-primary hover:underline mt-2"
                        >
                          Unlock Details <ChevronRight className="w-4 h-4 ml-0.5" />
                        </a>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: History Timeline */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-primary" /> History Log
          </h3>

          {history.length === 0 ? (
            <div className="p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center bg-white/50 dark:bg-zinc-900/50">
              <Lock className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground italic">Previous days will populate here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
                >
                  <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {format(new Date(h.day), "MMM d, yyyy")}
                  </p>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{h.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{h.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
