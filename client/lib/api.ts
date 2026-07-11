import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("home-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes("/auth/");
    if (error.response?.status === 401 && !isAuthRoute && typeof window !== "undefined") {
      localStorage.removeItem("home-token");
      localStorage.removeItem("home-user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
