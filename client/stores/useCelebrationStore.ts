import { create } from "zustand";

export type CelebrationIntensity = "small" | "big";

export interface CelebrationBurst {
  id: number;
  intensity: CelebrationIntensity;
  /** Optional emoji theme; falls back to confetti. */
  emoji?: string;
}

interface CelebrationStore {
  bursts: CelebrationBurst[];
  celebrate: (intensity?: CelebrationIntensity, emoji?: string) => void;
  consume: (id: number) => void;
}

let nextId = 1;

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  bursts: [],
  celebrate: (intensity = "big", emoji) => {
    const id = nextId++;
    set((state) => ({
      bursts: [...state.bursts, { id, intensity, emoji }],
    }));
    // Auto-remove after the animation has had time to play.
    setTimeout(() => {
      set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) }));
    }, 3500);
  },
  consume: (id) =>
    set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) })),
}));

/**
 * Convenience hook returning the celebrate() action.
 */
export function useCelebration() {
  return useCelebrationStore((s) => s.celebrate);
}
