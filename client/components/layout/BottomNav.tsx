"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const bottomNavItems = [
  { label: "Home", href: "/", emoji: "🏠" },
  { label: "Scrapbook", href: "/scrapbook", emoji: "📸" },
  { label: "Letters", href: "/letters", emoji: "💌" },
  { label: "Comfort", href: "/comfort", emoji: "🫂" },
];

interface BottomNavProps {
  onMenuOpen: () => void;
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();
  const { playSound } = useSoundEffects();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "glass border-t border-border/50",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Menu button */}
        <button
          onClick={() => {
            playSound("tap");
            onMenuOpen();
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 active:scale-95 transition-all cursor-pointer",
            "text-muted-foreground transition-colors",
          )}
        >
          <Menu className="w-5 h-5 animate-pulse-soft" />
          <span className="text-[10px] font-medium">More</span>
        </button>

        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                playSound("tap");
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 active:scale-95 transition-all",
                "transition-colors duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(190,58,110,0.4)]"
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                />
              )}
              <span className="text-lg">{item.emoji}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
