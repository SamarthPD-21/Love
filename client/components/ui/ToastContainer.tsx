"use client";

import { useToastStore, Toast } from "@/stores/useToastStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          borderClass: "border-l-4 border-l-emerald-500",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          containerClass: "",
        };
      case "error":
        return {
          borderClass: "border-l-4 border-l-rose-500",
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          containerClass: "",
        };
      case "celebration":
        return {
          borderClass: "border-l-4 border-l-amber-400",
          icon: <PartyPopper className="w-5 h-5 text-amber-500 shrink-0" />,
          containerClass:
            "bg-gradient-to-r from-amber-50/90 via-pink-50/90 to-purple-50/90 dark:from-amber-950/40 dark:via-pink-950/40 dark:to-purple-950/40",
        };
      case "info":
      default:
        return {
          borderClass: "border-l-4 border-l-primary",
          icon: <Info className="w-5 h-5 text-primary shrink-0" />,
          containerClass: "",
        };
    }
  };

  const { borderClass, icon, containerClass } = getStyles();

  return (
    <motion.div
      layout
      initial={toast.type === "celebration"
        ? { opacity: 0, y: 30, scale: 0.9 }
        : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-border/40 glass",
        borderClass,
        containerClass
      )}
    >
      {toast.emoji && (
        <span className="text-xl shrink-0">{toast.emoji}</span>
      )}
      {icon}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "leading-relaxed break-words",
          toast.type === "celebration"
            ? "text-sm font-bold text-foreground"
            : "text-sm font-semibold text-foreground"
        )}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/55 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss Notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
