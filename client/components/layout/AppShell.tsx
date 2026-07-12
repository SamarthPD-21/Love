"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { FloatingHearts } from "@/components/animations/FloatingHearts";
import { Fireflies } from "@/components/animations/Fireflies";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useSoundStore } from "@/stores/useSoundStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToastStore } from "@/stores/useToastStore";
import PersistentPlayer from "@/components/music/PersistentPlayer";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Volume2, VolumeX, Heart, Sun, Moon, RefreshCw } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { timeOfDay } = useTimeOfDay();
  const { isMuted, toggleMute } = useSoundStore();
  const { playSound } = useSoundEffects();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const handleRefresh = async () => {
    playSound("whoosh");
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      showToast("Space synchronized!", "success");
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const { data: profile } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.user;
    },
  });

  const partner = profile?.partnerId;
  const isNight = timeOfDay === "night" || timeOfDay === "evening";

  const getTimeEmoji = () => {
    switch (timeOfDay) {
      case "morning":
        return "🌅";
      case "afternoon":
        return "☀️";
      case "evening":
        return "🌇";
      default:
        return "🌙";
    }
  };

  const handleMuteClick = () => {
    toggleMute();
    if (isMuted) {
      setTimeout(() => playSound("tap"), 50);
    }
  };

  return (
    <div className="flex min-h-dvh">
      {/* Ambient background animation */}
      {isNight ? (
        <Fireflies count={10} />
      ) : (
        <FloatingHearts count={5} />
      )}

      {/* Sidebar — always visible on lg, drawer on mobile */}
      <AnimatePresence>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </AnimatePresence>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-dvh relative z-10",
          "pb-20 lg:pb-0", // Bottom nav padding on mobile
        )}
      >
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#FDF6F0]/75 dark:bg-[#0F0A1A]/75 border-b border-border/30 backdrop-blur-md">
          {partner ? (
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-primary/15 flex items-center justify-center border border-primary/10">
                {partner.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-primary uppercase">
                    {partner.name.slice(0, 2)}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-zinc-950 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block leading-none">
                  Partner
                </span>
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50 leading-none">
                  {partner.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary/20 animate-pulse-soft" />
              <span>Home Space</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Time of day indicator */}
            <span className="text-sm cursor-help animate-float" title={`It's ${timeOfDay}!`}>
              {getTimeEmoji()}
            </span>

            {/* Theme toggle */}
            {mounted ? (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-muted dark:hover:bg-muted/60 transition-all cursor-pointer active:scale-90 border border-border/50 text-foreground"
                aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-muted/20 animate-pulse border border-border/50" />
            )}

            {/* Global Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-muted dark:hover:bg-muted/60 transition-all cursor-pointer active:scale-90 border border-border/50 text-foreground"
              aria-label="Synchronize Space"
            >
              <RefreshCw className={cn("w-4 h-4 text-primary", isRefreshing ? "animate-spin" : "")} />
            </button>

            {/* Global sound toggle */}
            <button
              onClick={handleMuteClick}
              className={cn(
                "p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-muted dark:hover:bg-muted/60 transition-all cursor-pointer active:scale-90 border border-border/50",
                isMuted ? "text-muted-foreground" : "text-primary"
              )}
              aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav onMenuOpen={() => setSidebarOpen(true)} />

      {/* Persistent global music player */}
      <PersistentPlayer />
    </div>
  );
}
