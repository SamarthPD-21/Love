import api from "./api";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  if (typeof window !== "undefined") {
    localStorage.setItem("home-token", data.token);
    localStorage.setItem("home-user", JSON.stringify(data.user));
  }
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", payload);
  if (typeof window !== "undefined") {
    localStorage.setItem("home-token", data.token);
    localStorage.setItem("home-user", JSON.stringify(data.user));
  }
  return data;
}

export async function generateInvite(): Promise<{ inviteCode: string }> {
  const { data } = await api.post<{ inviteCode: string }>("/auth/invite");
  return data;
}

export async function registerCreator(payload: Omit<RegisterPayload, "inviteCode">): Promise<AuthResponse & { inviteCode: string }> {
  const { data } = await api.post<AuthResponse & { inviteCode: string }>("/auth/invite", payload);
  if (typeof window !== "undefined") {
    localStorage.setItem("home-token", data.token);
    localStorage.setItem("home-user", JSON.stringify(data.user));
  }
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("home-user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("home-token");
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("home-token");
    localStorage.removeItem("home-user");
    window.location.href = "/login";
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
