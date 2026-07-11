"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, User, Mail, Lock, Eye, EyeOff, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Result state
  const [signupResult, setSignupResult] = useState<{
    user: any;
    token: string;
    inviteCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Calls POST /api/auth/invite to register first user & create relationship
      const response = await api.post("/auth/invite", {
        name,
        email,
        password,
      });

      if (response.data) {
        setSignupResult(response.data);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!signupResult) return;
    navigator.clipboard.writeText(signupResult.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterHome = () => {
    if (!signupResult) return;
    setAuth(signupResult.user, signupResult.token);
    router.push("/");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {!signupResult ? (
          /* Step 1: Signup Form */
          <motion.div
            key="signup-form"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 border border-primary/20"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-8 h-8 text-primary fill-primary animate-pulse-soft" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Create Our Home
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Start a private digital space for the two of you ❤️
              </p>
            </div>

            {/* Signup Card */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should they call you?"
                      required
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl text-sm",
                        "bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
                        "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl text-sm",
                        "bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
                        "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password ❤️"
                      required
                      minLength={6}
                      className={cn(
                        "w-full pl-10 pr-12 py-3 rounded-xl text-sm",
                        "bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
                        "text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
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
                    "w-full py-3 rounded-xl font-semibold text-sm cursor-pointer mt-2",
                    "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-all duration-200",
                    "shadow-md hover:shadow-lg"
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating space...
                    </span>
                  ) : (
                    "Create Our Space"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>

              {/* Back to Login */}
              <Link
                href="/login"
                className={cn(
                  "w-full flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold border",
                  "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
                  "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  "transition-all duration-200"
                )}
              >
                Already have an account? Sign in
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Step 2: Show Invite Code Success screen */
          <motion.div
            key="signup-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            {/* Header */}
            <div>
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-500 mb-4"
                initial={{ rotate: 180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Sparkles className="w-8 h-8 fill-emerald-500/10" />
              </motion.div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Home Created! 🏠
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Now, invite your partner to join your private space.
              </p>
            </div>

            {/* Code Reveal Card */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-8 space-y-4">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Partner Invite Code
              </p>

              {/* Code display block */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 select-all font-mono">
                <span className="text-2xl font-bold tracking-widest text-primary flex-1 text-center">
                  {signupResult.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    copied
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 border border-zinc-200 dark:border-zinc-800"
                  )}
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                Send this 8-character code to your partner. They will register using this code to link your accounts together.
              </p>

              <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={handleEnterHome}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold text-sm cursor-pointer",
                    "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]",
                    "transition-all duration-200 shadow-md hover:shadow-lg"
                  )}
                >
                  Enter Our Home ❤️
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
