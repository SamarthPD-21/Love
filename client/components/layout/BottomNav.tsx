"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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

  const isMoreActive = !bottomNavItems.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "bg-card/90 backdrop-blur-xl border-t border-border/40",
        "shadow-[0_-1px_20px_rgba(0,0,0,0.06)]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex items-center justify-around h-[68px] px-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => playSound("tap")}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5",
                "transition-all duration-200 cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {/* Active pill background */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute -top-0.5 left-3 right-3 h-1.5 rounded-full bg-primary"
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                />
              )}

              <span className={cn(
                "text-[22px] leading-none transition-transform duration-200",
                isActive && "scale-110"
              )}>
                {item.emoji}
              </span>
              <span className={cn(
                "text-[10px] font-semibold leading-none",
                isActive && "font-bold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => {
            playSound("pop");
            onMenuOpen();
          }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5",
            "transition-all duration-200 cursor-pointer",
            isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isMoreActive && (
            <motion.div
              layoutId="bottom-nav-pill"
              className="absolute -top-0.5 left-3 right-3 h-1.5 rounded-full bg-primary"
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            />
          )}
          <motion.span
            className="text-[22px] leading-none"
            whileTap={{ rotate: 90, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            ⋯
          </motion.span>
          <span className="text-[10px] font-semibold leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
