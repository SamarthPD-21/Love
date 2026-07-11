"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandHeart, Heart, Sparkles, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [hugCount, setHugCount] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const handleHugClick = () => {
    setHugCount((prev) => prev + 1);
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  const handleNextQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % COMFORT_QUOTES.length);
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <HandHeart className="w-8 h-8 text-primary" /> Comfort Corner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A quiet, peaceful room to visit when you miss them, feel tired, or need a virtual hug 🫂
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Left/Middle Column: Reassurance card & Hug Button */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-8 min-h-[400px]">
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

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {hugCount === 0 ? "Need a hug?" : `Sent ${hugCount} Hugs 🫂`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Whenever you feel lonely, tap the heart button above to send a virtual embrace. We are always connected.
            </p>
          </div>
        </div>

        {/* Right Column: Cozy Reassurance Quote Drawer */}
        <div className="card-cozy p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden bg-primary/5 dark:bg-primary/10 border-2 border-primary/10">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Reassurance Notes
            </span>

            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="handwritten text-xl sm:text-2xl leading-relaxed text-zinc-800 dark:text-zinc-100 italic"
              >
                &ldquo;{COMFORT_QUOTES[quoteIdx]}&rdquo;
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="border-t border-primary/10 pt-4 mt-6">
            <button
              onClick={handleNextQuote}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Smile className="w-4 h-4 text-primary" /> Draw Another Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
