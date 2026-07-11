"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Heart, Camera, ScrollText, Mic, Target, Music, Flower2, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface StatsData {
  togetherDays: number;
  memoriesCount: number;
  lettersCount: number;
  voiceNotesCount: number;
  dreamsCount: {
    total: number;
    completed: number;
  };
  songsCount: number;
  gratitudesCount: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/stats");
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" /> Our Space Stats
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A numeric look at our private digital home and everything we shared together 📊
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !stats ? (
        <div className="flex-1 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200/50 p-8 text-center text-sm text-muted-foreground italic">
          Failed to load statistics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Anniversary Counter */}
          <motion.div
            whileHover={{ y: -4 }}
            className="card-cozy p-6 bg-gradient-to-br from-rose-50/50 to-primary/5 dark:from-zinc-900/50 dark:to-zinc-900/50 border-rose-100 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Heart className="w-5 h-5 text-primary fill-primary/10" />
              <span className="font-semibold">Together Days</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {stats.togetherDays}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Every day spent loving you is a beautiful addition to our scrapbook.
            </p>
          </motion.div>

          {/* Memories Stats */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-semibold">Memories Captured</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.memoriesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Snapshots of our dates, road trips, and standard goofy selfies.
            </p>
          </motion.div>

          {/* Letters count */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <ScrollText className="w-5 h-5 text-primary" />
              <span className="font-semibold">Letters Written</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.lettersCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Envelope letters sealed, opened, or waiting for future unlock dates.
            </p>
          </motion.div>

          {/* Voice Notes */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Mic className="w-5 h-5 text-primary" />
              <span className="font-semibold">Voice Notes Left</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.voiceNotesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Audio notes left to remind each other of our voices when we are apart.
            </p>
          </motion.div>

          {/* Dreams Goal */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold">Dreams & Bucket List</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.dreamsCount.completed} / {stats.dreamsCount.total}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Shared goals completed out of our grand bucket list of future wishes.
            </p>
          </motion.div>

          {/* Playlist count */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Music className="w-5 h-5 text-primary" />
              <span className="font-semibold">Songs in Playlist</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.songsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Shared music tracks that remind us of our highway drives and late nights.
            </p>
          </motion.div>

          {/* Gratitudes counts */}
          <motion.div whileHover={{ y: -4 }} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Flower2 className="w-5 h-5 text-primary" />
              <span className="font-semibold">Gratitudes Logged</span>
            </div>
            <p className="text-4xl font-extrabold text-zinc-955 dark:text-zinc-50 tracking-tight">
              {stats.gratitudesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Little things we appreciated and said thank you for about each other.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
