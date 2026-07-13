"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { BottomSheet } from "./BottomSheet";
import { FloatingHearts } from "@/components/animations/FloatingHearts";
import { Fireflies } from "@/components/animations/Fireflies";
import { SparkleTrail } from "@/components/animations/SparkleTrail";
import { Confetti } from "@/components/animations/Confetti";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { useLiveNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useSoundStore } from "@/stores/useSoundStore";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToastStore } from "@/stores/useToastStore";
import PersistentPlayer from "@/components/music/PersistentPlayer";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Heart } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { timeOfDay } = useTimeOfDay();
  const { playSound } = useSoundEffects();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  // Live notification listener (socket.io) + unread polling
  useLiveNotifications();

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

  const handleMenuOpen = () => {
    setSidebarOpen(false);
    setSheetOpen(true);
  };

  return (
    <div className="flex min-h-dvh lg:h-screen lg:overflow-hidden">
      {/* Ambient background animation */}
      {isNight ? (
        <>
          <Fireflies count={10} />
          <SparkleTrail count={12} />
        </>
      ) : (
        <>
          <FloatingHearts count={5} />
          <SparkleTrail count={15} />
        </>
      )}

      {/* Global confetti layer */}
      <Confetti />

      {/* Sidebar — always visible on lg, drawer on mobile */}
      <AnimatePresence>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </AnimatePresence>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 min-w-0 flex flex-col min-h-dvh lg:h-screen lg:overflow-y-auto relative z-10",
          "pb-[80px] lg:pb-0", // Bottom nav padding on mobile (matches 68px bar + safe area)
        )}
      >
        {/* Header Bar — visible on all viewports, aligns to top-right on desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8 lg:py-4 bg-background/75 border-b border-border/10 backdrop-blur-md lg:justify-end">
          {partner ? (
            <Link
              href="/profile"
              onClick={() => playSound("tap")}
              className="flex lg:hidden items-center gap-2.5 group cursor-pointer hover:opacity-85 active:scale-95 transition-all"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-primary/15 flex items-center justify-center border border-primary/10">
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
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block leading-none group-hover:text-primary transition-colors">
                  Partner
                </span>
                <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 leading-none mt-0.5 group-hover:text-primary transition-colors block">
                  {partner.name}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex lg:hidden items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary/20 animate-pulse-soft" />
              <span>Home Space</span>
            </div>
          )}

          {/* Controls — only time emoji + notification bell */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm cursor-help animate-float" title={`It's ${timeOfDay}!`}>
              {getTimeEmoji()}
            </span>
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav onMenuOpen={handleMenuOpen} />

      {/* Bottom sheet — secondary nav + quick actions (mobile only) */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      {/* Persistent global music player */}
      <PersistentPlayer />
    </div>
  );
}
