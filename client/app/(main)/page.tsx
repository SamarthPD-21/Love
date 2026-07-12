"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Gift, Camera, CloudSun, MessageCircleHeart, Clock, Sparkles, Loader2, ArrowRight, MapPin } from "lucide-react";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { useCountdown } from "@/hooks/useCountdown";
import { PageTransition } from "@/components/animations/PageTransition";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn, daysBetween, formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { format } from "date-fns";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useDistance } from "@/hooks/useDistance";

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
  const { playSound } = useSoundEffects();
  const { distance, isLoading: distanceLoading } = useDistance();

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
    playSound("chime");
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

  const partner = profile?.partnerId;
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

  // Dynamic text color classes for the hero banner to keep text highly visible in both light/dark modes
  const isNight = timeOfDay === "night";
  const titleColor = isNight ? "text-slate-100" : "text-slate-900 dark:text-slate-100";
  const subGreetingColor = isNight ? "text-slate-300/90" : "text-slate-700/90 dark:text-slate-300/90";
  const messageLabelColor = isNight ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  const messageColor = isNight ? "text-slate-200" : "text-slate-800 dark:text-slate-200";
  const borderDividerColor = isNight ? "border-slate-200/15" : "border-foreground/10";

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
        {/* ── Hero Greeting ── */}
        <motion.div
          className={cn(
            "rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-xl border border-white/10 glass",
            bgClass,
          )}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Animated glow effects */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/20 blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse-soft" />
          <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-secondary/15 blur-2xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 opacity-40 bg-gradient-to-tr from-primary/10 via-accent/5 to-transparent mix-blend-plus-lighter" />

          <div className="relative z-10 space-y-4">
            <div className="space-y-1">
              <motion.h1
                className={cn("text-3.5xl sm:text-4xl font-bold tracking-tight font-display", titleColor)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Our Little Universe <span className="inline-block animate-float">💫</span>
              </motion.h1>
              <motion.p
                className={cn(
                  "text-base sm:text-lg font-medium handwritten text-xl italic leading-relaxed",
                  subGreetingColor,
                )}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {subGreeting}
              </motion.p>
            </div>

            {/* Daily Message integrated inside the banner */}
            <motion.div
              className={cn("pt-4 border-t flex flex-col gap-1.5", borderDividerColor)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest", messageLabelColor)}>
                <MessageCircleHeart className="w-3.5 h-3.5 text-primary fill-primary animate-pulse-soft" />
                <span>Today&apos;s Message</span>
              </div>
              <p className={cn("font-display text-lg sm:text-xl leading-relaxed italic pl-3 border-l border-primary/30", messageColor)}>
                &ldquo;{dailyMessageResponse?.message || "You're the best part of every single day. Never forget that. ❤️"}&rdquo;
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Quick Shortcuts ── */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {[
            { label: "Scrapbook", href: "/scrapbook", emoji: "📸", colorClass: "hover:border-primary/50 hover:shadow-[0_0_15px_rgba(232,88,122,0.15)]", color: "from-[#F2D4D8] to-[#E8B8C4] dark:from-[#3D1520] dark:to-[#4D1A2A]" },
            { label: "Letters", href: "/letters", emoji: "💌", colorClass: "hover:border-secondary/50 hover:shadow-[0_0_15px_rgba(184,169,201,0.15)]", color: "from-[#E8D4EC] to-[#D4B8E0] dark:from-[#2A1840] dark:to-[#361E52]" },
            { label: "Comfort", href: "/comfort", emoji: "🫂", colorClass: "hover:border-accent/50 hover:shadow-[0_0_15px_rgba(212,165,116,0.15)]", color: "from-[#F0DCC8] to-[#E8C8A0] dark:from-[#3A2010] dark:to-[#4A2A18]" },
            { label: "Lounge", href: "/lounge", emoji: "🎵", colorClass: "hover:border-success/50 hover:shadow-[0_0_15px_rgba(88,168,112,0.15)]", color: "from-[#D8E8D0] to-[#C0D8B8] dark:from-[#1A2E1A] dark:to-[#244024]" },
          ].map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              onClick={() => playSound("tap")}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl bg-card/60 dark:bg-card/60 border border-border/50 hover:bg-card hover:scale-[1.03] hover:shadow-md transition-all duration-300 text-center group cursor-pointer active:scale-95 shadow-sm",
                action.colorClass
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl mb-3 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
                action.color
              )}>
                {action.emoji}
              </div>
              <span className="text-xs font-extrabold text-foreground/80 leading-none group-hover:text-primary transition-colors">
                {action.label}
              </span>
            </Link>
          ))}
        </motion.div>

        {/* ── Cards Grid ── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Together Counter */}
          <motion.div variants={item} className="card-cozy p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Heart className="w-4 h-4 text-primary fill-primary animate-pulse-soft" />
                  <span className="font-bold uppercase tracking-wider text-xs">Our Journey</span>
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-2">
                  {formatNumber(togetherDays)}
                  <span className="text-sm font-bold text-muted-foreground ml-2 block sm:inline">
                    Days Together
                  </span>
                </p>
              </div>
              <motion.div
                className="text-4xl cursor-pointer select-none"
                animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                onClick={() => playSound("heartbeat")}
              >
                ❤️
              </motion.div>
            </div>

            {/* Side-by-Side Avatars */}
            <div className="flex items-center justify-center gap-2.5 mt-6 pt-4 border-t border-border/40">
              {/* My Avatar */}
              <div className="relative group">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-primary/10 shadow-md transition-transform duration-350 group-hover:scale-105">
                  {profile?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar} alt={profile?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-primary text-xs">
                      {profile?.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-full border border-background uppercase tracking-widest leading-none scale-90 shadow-sm">Me</span>
              </div>

              {/* Connector */}
              <div className="flex items-center gap-1.5 relative px-2">
                <div className="w-8 h-[2px] bg-gradient-to-r from-primary/30 via-primary/50 to-secondary/30" />
                <div className="relative shrink-0 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary fill-primary animate-pulse-soft" />
                  <span className="absolute w-6 h-6 rounded-full bg-primary/20 animate-ping opacity-60" />
                </div>
                <div className="w-8 h-[2px] bg-gradient-to-r from-secondary/30 via-secondary/50 to-primary/30" />
              </div>

              {/* Partner Avatar */}
              {partner ? (
                <div className="relative group">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-secondary bg-secondary/10 shadow-md transition-transform duration-350 group-hover:scale-105">
                    {partner.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-secondary text-xs">
                        {partner.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-full border border-background uppercase tracking-widest leading-none scale-90 shadow-sm">Love</span>
                </div>
              ) : (
                <Link
                  href="/settings"
                  onClick={() => playSound("tap")}
                  className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:border-primary transition-colors cursor-pointer"
                >
                  +
                </Link>
              )}
            </div>
          </motion.div>

          {/* Dynamic Next Countdown Card */}
          <motion.div variants={item} className="card-cozy p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary animate-pulse-soft" />
                <span className="font-bold uppercase tracking-wider text-xs truncate max-w-[140px]">
                  {nearestCountdown ? nearestCountdown.title : "Next Hug"}
                </span>
              </div>
              {nearestCountdown && (
                <Link
                  href="/dreams"
                  onClick={() => playSound("tap")}
                  className="text-[10px] text-primary hover:underline font-bold flex items-center shrink-0"
                >
                  All <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              )}
            </div>
            
            {nearestCountdown ? (
              countdownTimer.isExpired ? (
                <p className="text-xl font-bold text-success animate-bounce">It&apos;s time! 🎉</p>
              ) : (
                <div className="flex gap-2">
                  <TimeBlock value={countdownTimer.days} label="days" />
                  <TimeBlock value={countdownTimer.hours} label="hours" />
                  <TimeBlock value={countdownTimer.minutes} label="min" />
                </div>
              )
            ) : (
              <div className="flex flex-col justify-center h-14">
                <p className="text-xs text-muted-foreground italic">No countdowns set.</p>
                <Link
                  href="/dreams"
                  onClick={() => playSound("tap")}
                  className="text-xs text-primary font-bold hover:underline mt-1"
                >
                  Create one now ⏰
                </Link>
              </div>
            )}
          </motion.div>

          {/* Live Distance Card */}
          <motion.div variants={item} className="card-cozy p-6 flex flex-col justify-between group">
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary animate-bounce" />
                <span className="font-bold uppercase tracking-wider text-xs">Our Distance</span>
              </div>
              <Link
                href="/profile"
                onClick={() => playSound("tap")}
                className="text-[10px] text-primary hover:underline font-bold flex items-center shrink-0"
              >
                Profile <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
              </Link>
            </div>
            
            {distanceLoading ? (
              <div className="flex items-center justify-center h-14">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : distance !== null ? (
              <div className="flex flex-col justify-center h-14">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-3xl font-black text-foreground tabular-nums">
                    {distance.toFixed(1)}
                  </p>
                  <span className="text-xs font-bold text-muted-foreground">km apart</span>
                </div>
                <p className="text-[10px] text-primary font-bold mt-1 animate-pulse-soft">
                  Just a heartbeat away ❤️
                </p>
              </div>
            ) : (
              <div className="flex flex-col justify-center h-14">
                <p className="text-xs text-muted-foreground italic">Distance unavailable</p>
                <Link
                  href="/profile"
                  onClick={() => playSound("tap")}
                  className="text-[10px] text-primary font-bold hover:underline mt-1"
                >
                  Enable location sharing 📍
                </Link>
              </div>
            )}
          </motion.div>

          {/* Today's Surprise (Collapsible Reveal Animation) */}
          <motion.div
            variants={item}
            className="card-cozy p-6 cursor-pointer group flex flex-col justify-between"
            onClick={handleOpenSurprise}
            whileHover={!revealSurprise ? { scale: 1.02 } : {}}
            whileTap={!revealSurprise ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Gift className="w-4 h-4 text-primary animate-bounce" />
              <span className="font-bold uppercase tracking-wider text-xs">Today&apos;s Surprise</span>
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
                    className="text-4xl filter drop-shadow-md"
                    animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                  >
                    🎁
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors mt-3 font-bold">
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
                  <h4 className="text-xs font-black text-foreground truncate">
                    {surpriseResponse?.title || "Daily Surprise"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 italic">
                    {surpriseResponse?.detail || "Click to see what was prepared!"}
                  </p>
                  <Link
                    href={surpriseResponse?.link || "/"}
                    className="inline-block mt-2 text-[10px] font-bold text-primary hover:underline bg-primary/10 px-2 py-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound("tap");
                    }}
                  >
                    View details →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Memory of the Day */}
          <motion.div variants={item} className="card-cozy p-6 cursor-pointer group flex flex-col justify-between">
            <Link
              href={memoryOfTheDay._id ? `/scrapbook?id=${memoryOfTheDay._id}` : "/scrapbook"}
              onClick={() => playSound("tap")}
              className="flex flex-col h-full justify-between"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Camera className="w-4 h-4 text-primary animate-pulse-soft" />
                <span className="font-bold uppercase tracking-wider text-xs">Memory of the Day</span>
              </div>
              <div className="relative rounded-xl bg-muted/50 p-6 text-center overflow-hidden border border-border/20 group-hover:border-primary/20 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/10" />
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2 group-hover:rotate-12 transition-transform" />
                  <p className="font-extrabold text-foreground text-sm truncate">{memoryOfTheDay.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {memoryOfTheDay.date ? (typeof memoryOfTheDay.date === "string" ? memoryOfTheDay.date : format(new Date(memoryOfTheDay.date), "MMM yyyy")) : "Dec 2025"}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Dynamic Weather Widget */}
          <motion.div variants={item} className="card-cozy p-6 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <CloudSun className="w-4 h-4 text-primary animate-pulse-soft" />
              <span className="font-bold uppercase tracking-wider text-xs">Weather</span>
            </div>
            
            {weatherLoading ? (
              <div className="flex items-center justify-center h-14">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-foreground">{weather ? `${weather.temp}°C` : "28°C"}</p>
                  <p className="text-xs text-muted-foreground">{weather ? weather.text : "Clear sky"}</p>
                </div>
                <span className="text-4xl filter drop-shadow-sm animate-float">{weather ? weather.emoji : "☀️"}</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3 handwritten text-sm">
              We&apos;re under the same sky ✨
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
    <div className="flex flex-col items-center flex-1 p-2 rounded-2xl bg-muted/60 dark:bg-muted/40 border border-border/50 shadow-inner min-w-[64px]">
      <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums tracking-tight">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mt-1 leading-none">
        {label}
      </span>
    </div>
  );
}
