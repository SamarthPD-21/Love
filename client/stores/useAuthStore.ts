import { create } from "zustand";
import type { User } from "@/types";
import { getStoredUser, getStoredToken } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("home-token", token);
      localStorage.setItem("home-user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("home-user", JSON.stringify(user));
    }
    set({ user });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("home-token");
      localStorage.removeItem("home-user");
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initialize: () => {
    const user = getStoredUser();
    const token = getStoredToken();
    if (user && token) {
      set({ user, token, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
