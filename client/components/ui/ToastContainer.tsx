"use client";

import { useToastStore, Toast } from "@/stores/useToastStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
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
        };
      case "error":
        return {
          borderClass: "border-l-4 border-l-rose-500",
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
        };
      case "info":
        default:
        return {
          borderClass: "border-l-4 border-l-primary",
          icon: <Info className="w-5 h-5 text-primary shrink-0" />,
        };
    }
  };

  const { borderClass, icon } = getStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-border/40 glass",
        borderClass
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-relaxed break-words">
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
