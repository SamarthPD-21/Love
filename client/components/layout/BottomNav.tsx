"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Camera, Mail, Heart, Menu } from "lucide-react";

const bottomNavItems = [
  { label: "Home", href: "/", icon: Home, emoji: "🏠" },
  { label: "Memories", href: "/memories", icon: Camera, emoji: "📸" },
  { label: "Letters", href: "/open-when", icon: Mail, emoji: "💌" },
  { label: "Us", href: "/stats", icon: Heart, emoji: "❤️" },
];

interface BottomNavProps {
  onMenuOpen: () => void;
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();

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
          onClick={onMenuOpen}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-14 py-1.5",
            "text-muted-foreground transition-colors",
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>

        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-14 py-1.5",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-primary"
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
