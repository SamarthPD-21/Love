"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { FloatingHearts } from "@/components/animations/FloatingHearts";
import { Fireflies } from "@/components/animations/Fireflies";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { timeOfDay } = useTimeOfDay();

  const isNight = timeOfDay === "night" || timeOfDay === "evening";

  return (
    <div className="flex min-h-dvh">
      {/* Ambient background animation */}
      {isNight ? (
        <Fireflies count={15} />
      ) : (
        <FloatingHearts count={8} />
      )}

      {/* Sidebar — always visible on lg, drawer on mobile */}
      <AnimatePresence>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </AnimatePresence>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-dvh relative z-10",
          "pb-20 lg:pb-0", // Bottom nav padding on mobile
        )}
      >
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav onMenuOpen={() => setSidebarOpen(true)} />
    </div>
  );
}
