"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSoundStore } from "@/stores/useSoundStore";
import { useToastStore } from "@/stores/useToastStore";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX, RefreshCw, Sun, Moon } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
}

const secondaryItems = [
  { label: "Dreams", href: "/dreams", emoji: "🌙" },
  { label: "Lounge", href: "/lounge", emoji: "🎵" },
  { label: "Profile", href: "/profile", emoji: "👤" },
  { label: "Settings", href: "/settings", emoji: "⚙️" },
];

export function BottomSheet({ open, onClose }: BottomSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { playSound } = useSoundEffects();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Dismiss on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleNavigate = (href: string) => {
    playSound("tap");
    router.push(href);
    onClose();
  };

  const handleRefresh = async () => {
    playSound("whoosh");
    showToast("Space synchronized!", "success");
    await queryClient.invalidateQueries();
    onClose();
  };

  const handleThemeToggle = () => {
    playSound("tap");
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isMuted = useSoundStore((s) => s.isMuted);
  const toggleMute = useSoundStore((s) => s.toggleMute);
  const handleMute = () => {
    toggleMute();
    if (isMuted) setTimeout(() => playSound("tap"), 50);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] lg:hidden transition-all duration-300 ease-in-out",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10",
          "bg-card/95 backdrop-blur-xl border-t border-border/60 rounded-t-3xl shadow-2xl",
          "max-h-[55dvh] overflow-y-auto",
          "pb-[env(safe-area-inset-bottom)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Close indicator line */}
        <div className="flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
        </div>

        {/* Secondary navigation tiles */}
        <div className="grid grid-cols-4 gap-3 px-5 py-2">
          {secondaryItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "flex flex-col items-center gap-2 py-4 rounded-2xl transition-all cursor-pointer active:scale-95",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-primary/10 border border-primary/20 shadow-sm"
                  : "bg-muted/50 border border-border/50 hover:bg-muted/80"
              )}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={cn(
                "text-[10px] font-bold",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-5 my-2 border-t border-border/50" />

        {/* Quick actions */}
        <div className="px-5 pb-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="flex items-center gap-2">
            <QuickAction icon={<RefreshCw className="w-4 h-4 text-primary" />} label="Sync" onClick={handleRefresh} />
            <QuickAction
              icon={mounted ? (
                resolvedTheme === "dark"
                  ? <Sun className="w-4 h-4 text-amber-400" />
                  : <Moon className="w-4 h-4 text-indigo-500" />
              ) : <div className="w-4 h-4" />}
              label={mounted ? (resolvedTheme === "dark" ? "Light" : "Dark") : "Theme"}
              onClick={handleThemeToggle}
            />
            <QuickAction
              icon={isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
              label={isMuted ? "Unmute" : "Sound"}
              onClick={handleMute}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quick action chip ── */
function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl",
        "bg-muted/50 border border-border/50 hover:bg-muted/80",
        "transition-all cursor-pointer active:scale-[0.97] text-xs font-medium text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
