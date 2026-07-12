"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

export interface SegmentItem {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface SegmentedControlProps {
  items: SegmentItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({ items, activeId, onChange, className }: SegmentedControlProps) {
  const { playSound } = useSoundEffects();

  return (
    <div
      className={cn(
        "flex p-1 space-x-1 bg-muted/60 dark:bg-muted/40 rounded-full border border-border/50 max-w-fit mx-auto backdrop-blur-md shadow-inner",
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => {
              if (!isActive) {
                playSound("tap");
                onChange(item.id);
              }
            }}
            className={cn(
              "relative flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors rounded-full z-10",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/40"
            )}
            style={{
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {isActive && (
              <motion.div
                layoutId="active-segment"
                className="absolute inset-0 bg-card rounded-full shadow-sm border border-border/80"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">
              {Icon && <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
