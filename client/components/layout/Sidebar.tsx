"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Home,
  Heart,
  Camera,
  Archive,
  Mail,
  ScrollText,
  Mic,
  Globe,
  Music,
  Film,
  Sparkles,
  BookOpen,
  Flower2,
  Target,
  Gamepad2,
  HandHeart,
  BarChart3,
  Settings,
  Timer,
  X,
} from "lucide-react";

const navItems = [
  { label: "Home", href: "/", icon: Home, emoji: "🏠" },
  { label: "Countdown", href: "/countdowns", icon: Timer, emoji: "❤️" },
  { label: "Memories", href: "/memories", icon: Camera, emoji: "📸" },
  { label: "Memory Jar", href: "/memory-jar", icon: Archive, emoji: "🫙" },
  { label: "Open When", href: "/open-when", icon: Mail, emoji: "💌" },
  { label: "Letters", href: "/letters", icon: ScrollText, emoji: "📜" },
  { label: "Voice Notes", href: "/voice-notes", icon: Mic, emoji: "🎤" },
  { label: "Timeline", href: "/timeline", icon: Globe, emoji: "🌎" },
  { label: "Songs", href: "/songs", icon: Music, emoji: "🎵" },
  { label: "Movies", href: "/movies", icon: Film, emoji: "🎬" },
  { label: "Daily Surprise", href: "/daily-surprise", icon: Sparkles, emoji: "🌸" },
  { label: "Journal", href: "/journal", icon: BookOpen, emoji: "📝" },
  { label: "Gratitude", href: "/gratitude", icon: Flower2, emoji: "🌼" },
  { label: "Dreams", href: "/dreams", icon: Target, emoji: "🎯" },
  { label: "Games", href: "/games", icon: Gamepad2, emoji: "🎮" },
  { label: "Comfort", href: "/comfort", icon: HandHeart, emoji: "🫂" },
  { label: "Stats", href: "/stats", icon: BarChart3, emoji: "📊" },
  { label: "Settings", href: "/settings", icon: Settings, emoji: "⚙️" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

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
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary"
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
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center handwritten text-base">
            Made with love ♥
          </p>
        </div>
      </aside>
    </>
  );
}

export { navItems };
