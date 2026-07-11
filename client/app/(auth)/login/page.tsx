"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { login } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await login({ email, password });
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Invalid email or password";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 border border-primary/20"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Heart className="w-8 h-8 text-primary fill-primary" />
        </motion.div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome Home
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your private space is waiting ❤️
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl text-sm",
                  "bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
                  "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={cn(
                  "w-full pl-10 pr-12 py-3 rounded-xl text-sm",
                  "bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
                  "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                  "transition-all duration-200"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-500 font-semibold text-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-sm cursor-pointer",
              "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-all duration-200",
              "shadow-md hover:shadow-lg"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Coming home...
              </span>
            ) : (
              "Come Home"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Action Options */}
        <div className="space-y-3">
          {/* Invite Code Option */}
          <Link
            href="/invite"
            className={cn(
              "w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold border",
              "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
              "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              "transition-all duration-200"
            )}
          >
            I have an invite code 💌
          </Link>

          {/* Sign Up Option (Creates relationship) */}
          <Link
            href="/signup"
            className={cn(
              "w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold border border-dashed",
              "border-primary/50 text-primary hover:bg-primary/5",
              "transition-all duration-200"
            )}
          >
            Create our private space 🏠
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        This space is only for the two of you 🤍
      </p>
    </motion.div>
  );
}
