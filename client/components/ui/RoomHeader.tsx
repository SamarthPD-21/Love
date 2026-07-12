"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RoomHeaderProps {
  title: string;
  subtitle: string;
  emoji: string;
  badge?: string;
  gradientClass?: string;
  actionButton?: React.ReactNode;
}

export function RoomHeader({
  title,
  subtitle,
  emoji,
  badge,
  gradientClass = "bg-primary/5 dark:bg-primary/10",
  actionButton,
}: RoomHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative w-full rounded-3xl p-6 sm:p-8 mb-8 border border-border/50 shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6",
        gradientClass,
        "backdrop-blur-sm"
      )}
    >
      {/* Decorative ambient glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none animate-pulse-soft" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none animate-pulse-soft" />

      <div className="relative z-10 flex items-center gap-4 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-card/60 border border-border/50 flex items-center justify-center text-4xl sm:text-5xl shadow-inner shrink-0 rotate-3 transition-transform hover:rotate-6 hover:scale-105 duration-300">
          {emoji}
        </div>
        
        <div>
          {badge && (
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-widest mb-2 border border-primary/20">
              {badge}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {subtitle}
          </p>
        </div>
      </div>

      {actionButton && (
        <div className="relative z-10 shrink-0 self-start md:self-center">
          {actionButton}
        </div>
      )}
    </motion.div>
  );
}
