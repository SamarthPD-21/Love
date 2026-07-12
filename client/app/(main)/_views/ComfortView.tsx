"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, Heart, Sparkles, Smile, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const COMFORT_QUOTES = [
  "No matter how far we are, we are under the same sky and sharing the same moon. 🌙",
  "Close your eyes, take a deep breath. I am holding your hand right now. 🤍",
  "Distance is just a test to see how far love can travel. Our love has no limits.",
  "You are my favorite thought. Every single day. ❤️",
  "I am so proud of you and everything you do. You've got this, my love!",
  "Sending you a warm, soft blanket of virtual hugs. Wrapping you tight. 🫂",
  "You make my world so much brighter just by being in it. 🌸",
  "I wish I was there to hug you, but for now, press the button below and feel my love!",
];

export default function ComfortPage() {
  const [myHugs, setMyHugs] = useState(0);
  const [partnerHugs, setPartnerHugs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const { playSound } = useSoundEffects();

  const fetchHugs = async () => {
    try {
      const res = await api.get("/users/hugs");
      if (res.data.success) {
        setMyHugs(res.data.myHugs);
        setPartnerHugs(res.data.partnerHugs);
      }
    } catch (e) {
      console.error("Failed to load hugs count:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHugs();
  }, []);

  const handleHugClick = async () => {
    playSound("heartbeat");
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);

    try {
      // Optimistic update
      setMyHugs((prev) => prev + 1);

      const res = await api.post("/users/hugs");
      if (res.data.success) {
        setMyHugs(res.data.myHugs);
        setPartnerHugs(res.data.partnerHugs);
      }
    } catch (e) {
      console.error("Failed to increment hugs count:", e);
    }
  };

  const handleNextQuote = () => {
    playSound("pop");
    setQuoteIdx((prev) => (prev + 1) % COMFORT_QUOTES.length);
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <HandHeart className="w-8 h-8 text-primary" /> Comfort Corner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A quiet, peaceful room to visit when you miss them, feel tired, or need a virtual hug 🫂
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Left/Middle Column: Reassurance card & Hug Button */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-8 min-h-[400px] shadow-xl">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Interactive Hug Node */}
          <div className="relative">
            <AnimatePresence>
              {showHeartBurst && (
                <motion.div
                  initial={{ opacity: 1, scale: 0.8, y: 0 }}
                  animate={{ opacity: 0, scale: 1.8, y: -40 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none text-4xl"
                >
                  ❤️
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleHugClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg border border-primary/20",
                "bg-gradient-to-br from-[#FFE4E6] to-[#FFE4CC] dark:from-[#3D1F2D] dark:to-[#2D1F3D]",
                "text-primary hover:shadow-xl transition-all duration-200"
              )}
            >
              <Heart className="w-12 h-12 fill-primary/10 animate-pulse-soft" />
              <span className="text-xs font-bold uppercase tracking-wider">Virtual Hug</span>
            </motion.button>
          </div>

          <div className="space-y-4 w-full max-w-sm">
            <h3 className="text-xl font-bold text-foreground">
              Need a virtual hug?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Whenever you feel lonely, tap the heart button above to send a virtual embrace. We are always connected.
            </p>

            {/* Hug Counters Section */}
            {loading ? (
              <div className="flex justify-center pt-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/15">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">My Hugs Sent</p>
                  <p className="text-2xl font-black text-foreground mt-1">{myHugs}</p>
                </div>
                <div className="p-3 bg-secondary/5 dark:bg-secondary/10 rounded-2xl border border-secondary/15">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Partner Hugs Sent</p>
                  <p className="text-2xl font-black text-foreground mt-1">{partnerHugs}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cozy Reassurance Quote Drawer */}
        <div className="card-cozy p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-primary/5 dark:bg-primary/10 border-2 border-primary/10 shadow-lg">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Reassurance Notes
            </span>

            <div className="min-h-[160px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={quoteIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="handwritten text-3xl sm:text-4xl leading-normal text-foreground"
                >
                  &ldquo;{COMFORT_QUOTES[quoteIdx]}&rdquo;
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-4 mt-6">
            <button
              onClick={handleNextQuote}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Smile className="w-4 h-4 text-primary" /> Draw Another Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
