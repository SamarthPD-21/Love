"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Mail, Lock, Eye, EyeOff, User, KeyRound, Loader2, Copy, Check } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { login, register, registerCreator } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type WizardStep = "login" | "signup" | "invite" | "code_display";

export function OnboardingWizard({ defaultStep = "login" }: { defaultStep?: WizardStep }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { playSound } = useSoundEffects();

  const [step, setStep] = useState<WizardStep>(defaultStep);
  const [direction, setDirection] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Generated code state
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);

  const navigateTo = (newStep: WizardStep, newDirection: number = 1) => {
    playSound("tap");
    setDirection(newDirection);
    setError("");
    setStep(newStep);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await login({ email, password });
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await registerCreator({ name, email, password });
      setAuth(data.user, data.token);
      setGeneratedCode(data.inviteCode || "");
      navigateTo("code_display");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await register({ name, email, password, inviteCode });
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid invite code or registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      playSound("chime");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const shareCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Love App space 🤍",
          text: `Use my invite code to join our private space: ${generatedCode}`,
          url: window.location.origin + "/invite",
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      copyCode();
    }
  };

  const tabs = [
    { id: "login", label: "Sign In", icon: Mail },
    { id: "signup", label: "Create Space", icon: Heart },
    { id: "invite", label: "Join Partner", icon: KeyRound },
  ];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo Area */}
      <div className="text-center mb-6 relative z-10">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 border border-primary/20 backdrop-blur-md"
          animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className="w-8 h-8 text-primary fill-primary animate-heartbeat" />
        </motion.div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
          Welcome Home
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your private universe, together ✨
        </p>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="glass rounded-3xl p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden space-y-6">
              
              {/* Tab Switcher (Hide when showing final invite code display) */}
              {step !== "code_display" && (
                <div className="w-full pb-2 border-b border-border/30">
                  <SegmentedControl
                    items={tabs}
                    activeId={step}
                    onChange={(id) => navigateTo(id as WizardStep)}
                    className="w-full"
                  />
                </div>
              )}

              {/* LOGIN STEP */}
              {step === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-500 font-semibold text-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Coming home...
                      </span>
                    ) : (
                      "Come Home ❤️"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("signup")}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      New to this space? Create Space 🏠
                    </button>
                  </div>
                </form>
              )}

              {/* SIGNUP STEP */}
              {step === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What should they call you?"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Something strong ❤️"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-500 font-semibold text-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up...
                      </span>
                    ) : (
                      "Create Space 🏠"
                    )}
                  </button>

                  <div className="text-center pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("login")}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Already have an account? Sign In 🔑
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("invite")}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Have an invite code? Join Partner 💌
                    </button>
                  </div>
                </form>
              )}

              {/* INVITE STEP */}
              {step === "invite" && (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Invite Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Enter the 8-character code"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What should they call you?"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Something strong ❤️"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-12 py-3 rounded-xl text-sm bg-muted/30 border border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-500 font-semibold text-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </span>
                    ) : (
                      "Join Our Home ❤️"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("login")}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      Already have an account? Sign In 🔑
                    </button>
                  </div>
                </form>
              )}

              {/* CODE DISPLAY STEP */}
              {step === "code_display" && (
                <div className="space-y-6 pt-4 text-center">
                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                    <p className="text-sm font-semibold text-primary">Your invite code is</p>
                    
                    <div 
                      onClick={copyCode}
                      className="text-4xl font-mono tracking-widest font-black text-foreground cursor-pointer flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                      {generatedCode}
                      {copied ? (
                        <Check className="w-6 h-6 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={shareCode}
                      className="w-full btn-primary"
                    >
                      Share with Partner
                    </button>
                    
                    <button
                      onClick={() => router.push("/")}
                      className="w-full py-3 rounded-xl font-semibold text-sm border border-border bg-card hover:bg-muted transition-all"
                    >
                      Go to Dashboard (Wait for them)
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
