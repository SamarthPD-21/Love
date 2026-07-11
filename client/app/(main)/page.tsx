"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Gift, Camera, CloudSun, MessageCircleHeart, Clock, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { useCountdown } from "@/hooks/useCountdown";
import { PageTransition } from "@/components/animations/PageTransition";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn, daysBetween, formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { format } from "date-fns";

const RELATIONSHIP_FALLBACK_START = "2024-10-01";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 180, damping: 20 } },
};

export default function HomePage() {
  const { user } = useAuthStore();
  const { timeOfDay, greeting, subGreeting } = useTimeOfDay();

  // Geolocation & Weather States
  const [weather, setWeather] = useState<{ temp: number; text: string; emoji: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Today's surprise reveal state
  const [revealSurprise, setRevealSurprise] = useState(false);

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const isOpened = localStorage.getItem(`surprise-opened-${todayStr}`) === "true";
    setRevealSurprise(isOpened);
  }, []);

  const handleOpenSurprise = () => {
    setRevealSurprise(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    localStorage.setItem(`surprise-opened-${todayStr}`, "true");
  };

  // 1. Dynamic Relationship Start Date (fetched from populated profile)
  const { data: profile } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.user;
    },
  });

  const rel = profile?.relationshipId;
  const relationshipStart = (rel && typeof rel === "object" && "startDate" in rel)
    ? rel.startDate
    : (user?.createdAt || RELATIONSHIP_FALLBACK_START);
  const togetherDays = daysBetween(new Date(relationshipStart), new Date());

  // 2. Fetch Countdowns to find the nearest upcoming target date
  const { data: countdowns = [] } = useQuery({
    queryKey: ["countdowns"],
    queryFn: async () => {
      const res = await api.get("/countdowns");
      return res.data.data;
    },
  });

  // Find nearest countdown in the future
  const upcomingCountdowns = countdowns.filter((c: any) => new Date(c.targetDate).getTime() > Date.now());
  const nearestCountdown = upcomingCountdowns[0]; // sorted by date in API
  const countdownTimer = useCountdown(nearestCountdown?.targetDate || new Date());

  // 3. Fetch Today's Message
  const { data: dailyMessageResponse } = useQuery({
    queryKey: ["daily-message"],
    queryFn: async () => {
      const res = await api.get("/daily/message");
      return res.data.data;
    },
  });

  // 4. Fetch Daily Surprise
  const { data: surpriseResponse } = useQuery({
    queryKey: ["daily-surprise"],
    queryFn: async () => {
      const res = await api.get("/daily/surprise");
      return res.data.data;
    },
  });

  // 5. Fetch Memories (for Memory of the Day)
  const { data: memories = [] } = useQuery({
    queryKey: ["memories-dashboard"],
    queryFn: async () => {
      const res = await api.get("/memories");
      return res.data.data;
    },
  });

  const memoryOfTheDay = memories[0] || {
    title: "That sunset in Goa 🌅",
    date: "Dec 2025",
    _id: null,
  };

  // Weather fetch using Geolocation + Open-Meteo API
  useEffect(() => {
    if (!navigator.geolocation) return;

    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const data = await res.json();
          if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            
            // Map weathercode to descriptions and emoji
            let text = "Clear sky";
            let emoji = "☀️";

            if (code === 0) { text = "Clear sky"; emoji = "☀️"; }
            else if (code >= 1 && code <= 3) { text = "Partly cloudy"; emoji = "🌤️"; }
            else if (code >= 45 && code <= 48) { text = "Foggy"; emoji = "🌫️"; }
            else if (code >= 51 && code <= 67) { text = "Rainy"; emoji = "🌧️"; }
            else if (code >= 71 && code <= 86) { text = "Snowy"; emoji = "❄️"; }
            else if (code >= 95 && code <= 99) { text = "Thunderstorm"; emoji = "⛈️"; }

            setWeather({ temp, text, emoji });
          }
        } catch (err) {
          console.error("Weather fetch failed:", err);
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        // user denied geolocation, fallback to mock weather
        setWeatherLoading(false);
      }
    );
  }, []);

  const bgClass = cn({
    "bg-time-morning": timeOfDay === "morning",
    "bg-time-afternoon": timeOfDay === "afternoon",
    "bg-time-evening": timeOfDay === "evening",
    "bg-time-night": timeOfDay === "night",
  });

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
        {/* ── Hero Greeting ── */}
        <motion.div
          className={cn(
            "rounded-2xl p-8 sm:p-10 mb-6 relative overflow-hidden",
            bgClass,
          )}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <motion.h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {greeting}, {user?.name || "Love"} <span className="inline-block animate-pulse-soft">❤️</span>
            </motion.h1>
            <motion.p
              className={cn(
                "mt-2 text-base sm:text-lg font-medium handwritten text-xl",
                timeOfDay === "night" ? "text-white/70" : "text-foreground/60",
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {subGreeting}
            </motion.p>
          </div>
        </motion.div>

        {/* ── Cards Grid ── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Together Counter */}
          <motion.div variants={item} className="card-cozy p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Heart className="w-4 h-4 text-primary fill-primary" />
                  <span className="font-medium">Together</span>
                </div>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  {formatNumber(togetherDays)}
                  <span className="text-lg sm:text-xl font-medium text-muted-foreground ml-2">
                    Days
                  </span>
                </p>
              </div>
              <motion.div
                className="text-5xl"
                animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                ❤️
              </motion.div>
            </div>
          </motion.div>

          {/* Dynamic Next Countdown Card */}
          <motion.div variants={item} className="card-cozy p-6">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium truncate max-w-[140px]">
                  {nearestCountdown ? nearestCountdown.title : "Next Hug"}
                </span>
              </div>
              {nearestCountdown && (
                <Link href="/countdowns" className="text-[10px] text-primary hover:underline font-semibold flex items-center">
                  All <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              )}
            </div>
            
            {nearestCountdown ? (
              countdownTimer.isExpired ? (
                <p className="text-xl font-bold text-success">It&apos;s time! 🎉</p>
              ) : (
                <div className="flex gap-3">
                  <TimeBlock value={countdownTimer.days} label="days" />
                  <TimeBlock value={countdownTimer.hours} label="hrs" />
                  <TimeBlock value={countdownTimer.minutes} label="min" />
                </div>
              )
            ) : (
              <div className="flex flex-col justify-center h-14">
                <p className="text-xs text-muted-foreground italic">No countdowns set.</p>
                <Link href="/countdowns" className="text-xs text-primary font-semibold hover:underline mt-1">
                  Create one now ⏰
                </Link>
              </div>
            )}
          </motion.div>

          {/* Today's Surprise (Collapsible Reveal Animation) */}
          <motion.div
            variants={item}
            className="card-cozy p-6 cursor-pointer group"
            onClick={handleOpenSurprise}
            whileHover={!revealSurprise ? { scale: 1.02 } : {}}
            whileTap={!revealSurprise ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Gift className="w-4 h-4 text-primary" />
              <span className="font-medium">Today&apos;s Surprise</span>
            </div>
            
            <AnimatePresence mode="wait">
              {!revealSurprise ? (
                <motion.div
                  key="closed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-4"
                >
                  <motion.div
                    className="text-4xl"
                    animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    🎁
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors mt-3">
                    Tap to open
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="opened"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 py-1 text-center"
                >
                  <span className="text-xl">✨</span>
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {surpriseResponse?.title || "Daily Surprise"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                    {surpriseResponse?.detail || "Click to see what was prepared!"}
                  </p>
                  <Link
                    href={surpriseResponse?.link || "/"}
                    className="inline-block mt-2 text-[10px] font-semibold text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View details →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Memory of the Day */}
          <motion.div variants={item} className="card-cozy p-6 cursor-pointer group">
            <Link href={memoryOfTheDay._id ? `/memories/${memoryOfTheDay._id}` : "/memories"}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Camera className="w-4 h-4 text-primary" />
                <span className="font-medium">Memory of the Day</span>
              </div>
              <div className="relative rounded-xl bg-muted/50 p-6 text-center overflow-hidden border border-border/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                  <p className="font-semibold text-foreground text-sm truncate">{memoryOfTheDay.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {memoryOfTheDay.date ? (typeof memoryOfTheDay.date === "string" ? memoryOfTheDay.date : format(new Date(memoryOfTheDay.date), "MMM yyyy")) : "Dec 2025"}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Dynamic Weather Widget */}
          <motion.div variants={item} className="card-cozy p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <CloudSun className="w-4 h-4 text-primary" />
              <span className="font-medium">Weather</span>
            </div>
            
            {weatherLoading ? (
              <div className="flex items-center justify-center h-14">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{weather ? `${weather.temp}°C` : "28°C"}</p>
                  <p className="text-xs text-muted-foreground">{weather ? weather.text : "Clear sky"}</p>
                </div>
                <span className="text-4xl">{weather ? weather.emoji : "☀️"}</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3 handwritten text-sm">
              We&apos;re under the same sky ✨
            </p>
          </motion.div>

          {/* Today's Message */}
          <motion.div variants={item} className="card-cozy p-6 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MessageCircleHeart className="w-4 h-4 text-primary fill-primary" />
              <span className="font-medium">Today&apos;s Message</span>
            </div>
            <p className="handwritten text-xl sm:text-2xl leading-relaxed text-foreground/90">
              &ldquo;{dailyMessageResponse?.message || "You're the best part of every single day. Never forget that. ❤️"}&rdquo;
            </p>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

/* ── Helper Components ── */
function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}
