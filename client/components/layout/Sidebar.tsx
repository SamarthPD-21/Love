"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn, daysBetween } from "@/lib/utils";
import api from "@/lib/api";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToastStore } from "@/stores/useToastStore";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useEffect, useState } from "react";
import {
  Home,
  Heart,
  X,
  User,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/", emoji: "🏠" },
  { label: "Scrapbook", href: "/scrapbook", emoji: "📸" },
  { label: "Letters", href: "/letters", emoji: "💌" },
  { label: "Comfort", href: "/comfort", emoji: "🫂" },
  { label: "Dreams", href: "/dreams", emoji: "🌙" },
  { label: "Lounge", href: "/lounge", emoji: "🎵" },
  { label: "Settings", href: "/settings", emoji: "⚙️" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { playSound } = useSoundEffects();

  const { data: profile } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.user;
    },
  });

  const partner = profile?.partnerId;
  const relationship = profile?.relationshipId;
  const relationshipStart = relationship?.startDate || profile?.createdAt;
  const togetherDays = relationshipStart ? daysBetween(new Date(relationshipStart), new Date()) : 0;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[280px] z-50 flex flex-col",
          "bg-card/95 backdrop-blur-xl border-r border-border",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:min-h-dvh lg:z-auto"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => {
              playSound("tap");
              onClose();
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 animate-glow-pulse flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary animate-pulse-soft" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Home
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Partner Profile Card */}
        <div className="px-4 py-4 border-b border-border bg-muted/20">
          {partner ? (
            <Link
              href="/profile"
              onClick={() => {
                playSound("tap");
                onClose();
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 dark:bg-card/60 border border-border/50 hover:bg-card/80 dark:hover:bg-card/80 transition-all duration-250 group cursor-pointer shadow-sm active:scale-[0.98]"
            >
              {/* Partner Avatar */}
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 border border-primary/10">
                {partner.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-lg font-black text-primary uppercase">
                    {partner.name.slice(0, 2)}
                  </span>
                )}
                {/* Online pulse bubble */}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
              </div>

              {/* Partner Details */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  My Partner
                </p>
                <h4 className="text-sm font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                  {partner.name}
                </h4>
                <p className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5 animate-pulse-soft">
                  💕 Together {togetherDays} Days
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/settings"
              onClick={() => {
                playSound("tap");
                onClose();
              }}
              className="flex flex-col gap-2 p-3 rounded-2xl border border-dashed border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group bg-card/20"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    No partner connected
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    Connect in settings
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  playSound("tap");
                  onClose();
                }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 active:scale-[0.98]",
                  isActive
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-primary to-accent"
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  />
                )}
                <span className="text-base">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border flex flex-col items-center gap-3">
          {/* Notification Bell */}
          <div className="w-full flex justify-center">
            <NotificationBell className="w-full" />
          </div>
          <GlobalRefreshButton />
          <ThemeToggle />
          <p className="text-xs text-muted-foreground text-center handwritten text-base">
            Made with love ♥
          </p>
        </div>
      </aside>
    </>
  );
}

function GlobalRefreshButton() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { playSound } = useSoundEffects();
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

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        "flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-border/50",
        "bg-muted/40 hover:bg-muted/80 transition-all duration-300",
        "text-sm font-medium text-foreground cursor-pointer group active:scale-[0.98] disabled:opacity-85"
      )}
      aria-label="Synchronize Space"
    >
      <span className="flex items-center gap-2">
        <RefreshCw className={cn("w-4 h-4 text-primary", isRefreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500")} />
        <span>Sync Space</span>
      </span>
      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
        Sync
      </span>
    </button>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-full bg-muted/20 animate-pulse rounded-xl" />;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-border/50",
        "bg-muted/40 hover:bg-muted/80 transition-all duration-300",
        "text-sm font-medium text-foreground cursor-pointer group active:scale-[0.98]"
      )}
      aria-label="Toggle Theme"
    >
      <span className="flex items-center gap-2">
        {resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500 group-hover:-rotate-12 transition-transform duration-500" />
        )}
        <span>{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </span>
      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
        Theme
      </span>
    </button>
  );
}

export { navItems };
