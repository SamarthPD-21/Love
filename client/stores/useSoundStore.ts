import { create } from "zustand";

interface SoundState {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundStore = create<SoundState>((set) => {
  const getInitialMute = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("love-app-muted");
      return stored === "true";
    }
    return false;
  };

  return {
    isMuted: getInitialMute(),
    toggleMute: () =>
      set((state) => {
        const next = !state.isMuted;
        if (typeof window !== "undefined") {
          localStorage.setItem("love-app-muted", String(next));
        }
        return { isMuted: next };
      }),
    setMuted: (muted: boolean) =>
      set(() => {
        if (typeof window !== "undefined") {
          localStorage.setItem("love-app-muted", String(muted));
        }
        return { isMuted: muted };
      }),
  };
});
