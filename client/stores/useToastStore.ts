import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "celebration";
  emoji?: string;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"], emoji?: string) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = "success", emoji) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, emoji }],
    }));
    
    // Auto dismiss after 3.5 seconds (celebration toasts linger a bit longer).
    const delay = type === "celebration" ? 5000 : 3500;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, delay);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
