"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvelopeProps {
  title: string;
  sender: string;
  date: string;
  isLocked?: boolean;
  unlockInfo?: string;
  onClick?: () => void;
  className?: string;
}

export function Envelope({
  title,
  sender,
  date,
  isLocked = false,
  unlockInfo,
  onClick,
  className,
}: EnvelopeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (isLocked) return;
    setIsOpen(true);
    if (onClick) {
      // Delay click to let animation play
      setTimeout(onClick, 1200);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className={cn(
        "relative w-full max-w-sm aspect-[1.6] bg-transparent cursor-pointer group perspective-[1000px]",
        isLocked && "cursor-not-allowed opacity-80",
        className
      )}
    >
      <motion.div
        animate={{
          rotateY: isLocked ? 0 : [0, 2, -2, 0],
          y: isLocked ? 0 : [0, -3, 0],
        }}
        transition={{
          repeat: Infinity,
          repeatDelay: 5,
          duration: 1.5,
        }}
        className="relative w-full h-full preserve-3d transition-transform duration-500 group-hover:scale-[1.02]"
      >
        {/* Envelope Back & Bottom Folds */}
        <div className="absolute inset-0 bg-[#E3DCD5] dark:bg-[#2C2736] rounded-xl shadow-md border border-[#D5CEC7] dark:border-[#383245] overflow-hidden">
          {/* Left Fold */}
          <div className="absolute left-0 bottom-0 top-0 w-1/2 bg-gradient-to-tr from-[#DDD6CE]/80 to-[#EBE4DC]/50 dark:from-[#24202D] dark:to-[#332D3F] [clip-path:polygon(0_0,_100%_50%,_0_100%)] z-20 border-r border-black/5" />
          {/* Right Fold */}
          <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-gradient-to-tl from-[#DDD6CE]/80 to-[#EBE4DC]/50 dark:from-[#24202D] dark:to-[#332D3F] [clip-path:polygon(100%_0,_0_50%,_100%_100%)] z-20 border-l border-black/5" />
          {/* Bottom Fold */}
          <div className="absolute left-0 right-0 bottom-0 h-3/5 bg-gradient-to-t from-[#DDD6CE] to-[#E3DCD5] dark:from-[#211D2A] dark:to-[#2A2534] [clip-path:polygon(0_100%,_50%_0,_100%_100%)] z-30 border-t border-black/5" />

          {/* Letter Card inside (Slides out) */}
          <motion.div
            initial={{ y: 0 }}
            animate={isOpen ? { y: "-75%", scale: 0.95, zIndex: 10 } : { y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="absolute left-4 right-4 top-4 bottom-4 bg-[#FAF9F6] dark:bg-zinc-800 rounded-lg p-4 shadow-sm z-10 flex flex-col justify-between border border-[#F0EFEA] dark:border-zinc-700"
          >
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">
                {title}
              </h4>
              <p className="text-[10px] text-muted-foreground">From {sender}</p>
            </div>
            <div className="flex justify-between items-center text-[9px] text-muted-foreground border-t border-zinc-200/50 dark:border-zinc-700/50 pt-2">
              <span>{date}</span>
              <Heart className="w-3 h-3 text-primary fill-primary animate-pulse-soft" />
            </div>
          </motion.div>
        </div>

        {/* Envelope Top Flap (Opens first) */}
        <motion.div
          style={{ originY: 0 }}
          animate={isOpen ? { rotateX: 180, zIndex: 5 } : { rotateX: 0, zIndex: 40 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={cn(
            "absolute left-0 right-0 top-0 h-1/2 bg-[#DDD6CE] dark:bg-[#342E3F] [clip-path:polygon(0_0,_50%_100%,_100%_0)] rounded-t-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.08)]",
            isOpen && "drop-shadow-none"
          )}
        >
          {/* Lock Badge */}
          {isLocked && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
              <span className="text-[10px] font-bold">🔒</span>
            </div>
          )}
        </motion.div>

        {/* Heart Seal (Sticker) */}
        {!isOpen && (
          <motion.div
            animate={isLocked ? {} : { scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white dark:bg-zinc-800 rounded-full w-8 h-8 flex items-center justify-center shadow-md border border-zinc-200/40"
          >
            <Heart
              className={cn(
                "w-4 h-4",
                isLocked ? "text-zinc-400" : "text-rose-500 fill-rose-500"
              )}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Lock Criteria message under envelope */}
      {isLocked && unlockInfo && (
        <div className="absolute inset-x-0 -bottom-8 text-center">
          <p className="text-[10px] text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-0.5 px-2 rounded-full inline-block">
            {unlockInfo}
          </p>
        </div>
      )}
    </div>
  );
}
