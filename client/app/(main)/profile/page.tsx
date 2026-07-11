"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MapPin, Sparkles, Navigation, Calendar, Mail, MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/animations/PageTransition";
import { useDistance } from "@/hooks/useDistance";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { daysBetween, formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { format } from "date-fns";
import Link from "next/link";

interface HugsResponse {
  success: boolean;
  myHugs: number;
  partnerHugs: number;
}

export default function PartnerProfilePage() {
  const queryClient = useQueryClient();
  const { playSound } = useSoundEffects();
  const { distance, myLocation, partnerLocation, partnerName, error: distanceError, isLoading: distanceLoading } = useDistance();
  
  const [showHearts, setShowHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [heartCount, setHeartCount] = useState(0);

  // Fetch current user & partner info
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.user;
    },
  });

  // Fetch hugs count
  const { data: hugs, isLoading: hugsLoading } = useQuery<HugsResponse>({
    queryKey: ["hugs"],
    queryFn: async () => {
      const res = await api.get("/users/hugs");
      return res.data;
    },
  });

  // Send hug mutation
  const sendHugMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/users/hugs");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["hugs"], data);
    },
  });

  const partner = userProfile?.partnerId;
  const relationship = userProfile?.relationshipId;
  const togetherDays = relationship?.startDate 
    ? daysBetween(new Date(relationship.startDate), new Date()) 
    : 0;

  const handleSendHug = (e: React.MouseEvent) => {
    playSound("heartbeat");
    sendHugMutation.mutate();

    // Spawn floating heart
    const newHeart = {
      id: Date.now(),
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
    };
    setShowHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setShowHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  // Get distance description
  const getDistanceText = () => {
    if (distance === null) return "Connecting coordinates...";
    if (distance < 0.1) return "Right next to each other! ❤️";
    if (distance < 1) return "Less than a kilometer away! 🏃‍♂️";
    if (distance < 5) return "Very close, just a short walk! 🌸";
    if (distance < 50) return "A short drive away. 🚗";
    return "Distance is just a test of how far love can travel. ✈️";
  };

  if (profileLoading) {
    return (
      <div className="min-h-[calc(100dvh-6rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100dvh-6rem)] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-bounce">
            <Heart className="w-8 h-8 fill-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground">No partner connected</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Connect your space with your partner in settings using your unique invite code.
          </p>
          <Link
            href="/settings"
            className="btn-primary mt-6 text-sm flex items-center gap-2"
          >
            Go to Settings ⚙️
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8 relative overflow-hidden">
        {/* Floating background particles */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30 dark:opacity-20">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-primary text-xl"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 50,
                scale: 0.5 + Math.random() * 0.8,
                opacity: 0.2 + Math.random() * 0.6,
              }}
              animate={{
                y: -100,
                x: `calc(100vw * ${Math.random()} + ${Math.sin(i) * 50}px)`,
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              ❤️
            </motion.div>
          ))}
        </div>

        {/* ── Floating Hearts click effects ── */}
        <AnimatePresence>
          {showHearts.map((h) => (
            <motion.div
              key={h.id}
              className="fixed text-primary text-3xl z-50 pointer-events-none"
              initial={{ opacity: 1, scale: 0.5, x: h.x - 15, y: h.y - 15 }}
              animate={{ opacity: 0, scale: 2.2, y: h.y - 120, x: h.x - 15 + (Math.random() - 0.5) * 60 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              ❤️
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Header */}
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse-soft" /> Partner Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A private space dedicated to your favorite person in the world 💫
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
          {/* Left Column: Avatar & Basic Details */}
          <div className="bg-card/70 border border-border/50 backdrop-blur-md rounded-3xl p-8 shadow-xl text-center flex flex-col items-center">
            {/* Romantic Rotating Avatar Ring */}
            <div className="relative group mb-6">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary blur-sm opacity-70 animate-pulse-soft group-hover:scale-105 transition-transform duration-300" />
              
              <div className="relative w-36 h-36 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border-4 border-card shadow-2xl flex items-center justify-center">
                {partner.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-primary uppercase">
                    {partner.name.slice(0, 2)}
                  </span>
                )}
              </div>
              
              <div className="absolute -bottom-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-background animate-bounce">
                <Heart className="w-4 h-4 fill-white" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-foreground">{partner.name}</h2>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mt-1">My Partner in Love</p>
            <p className="text-xs text-muted-foreground mt-1 select-all">{partner.email}</p>

            <div className="w-full border-t border-border/60 my-6" />

            <div className="space-y-4 w-full">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 dark:bg-card/30 border border-border/40">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Anniversary</p>
                  <p className="text-xs font-bold text-foreground mt-1">
                    {relationship?.startDate 
                      ? format(new Date(relationship.startDate), "MMMM d, yyyy")
                      : "Not set yet"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 dark:bg-card/30 border border-border/40">
                <Heart className="w-5 h-5 text-primary fill-primary shrink-0 animate-pulse-soft" />
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Days Together</p>
                  <p className="text-xs font-extrabold text-foreground mt-1">
                    {formatNumber(togetherDays)} Days of Happiness
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle & Right Column: Location & Interactions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Live Distance Widget */}
            <div className="bg-card/70 border border-border/50 backdrop-blur-md rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2 mb-6">
                <MapPin className="w-4 h-4 text-primary" /> Live Distance Tracker
              </h3>

              {distanceLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground font-semibold">Tuning compasses...</p>
                </div>
              ) : distanceError ? (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 text-xs">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <p className="font-semibold leading-relaxed">
                    {distanceError}. Enable location permissions for both of you to compute real-time distance.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Distance Visualizer */}
                  <div className="relative py-8 bg-background/30 rounded-2xl border border-border/30 overflow-hidden flex items-center justify-center">
                    {/* Pulsing hearts trace line */}
                    <div className="absolute w-[80%] h-[2px] bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30" />
                    
                    <div className="relative z-10 w-full max-w-sm px-6 flex items-center justify-between">
                      {/* My Avatar dot */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden shadow-md">
                          {userProfile?.avatar ? (
                            <img src={userProfile.avatar} alt="Me" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-primary/10 text-primary">Me</div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">Me</span>
                      </div>

                      {/* Connection Line */}
                      <div className="flex-1 flex items-center justify-center relative">
                        <motion.div 
                          className="text-lg animate-pulse"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ❤️
                        </motion.div>
                        <div className="absolute w-full h-full overflow-hidden top-0 left-0 pointer-events-none">
                          <motion.div 
                            className="w-2 h-2 rounded-full bg-primary absolute top-1/2 -translate-y-1/2"
                            animate={{ left: ["5%", "95%"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      </div>

                      {/* Partner Avatar dot */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-full border-2 border-secondary overflow-hidden shadow-md">
                          {partner.avatar ? (
                            <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-secondary/10 text-secondary">Us</div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{partner.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-4xl font-black tracking-tight text-foreground">
                      {distance !== null ? `${distance.toFixed(2)} km` : "..."}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1 handwritten text-lg">
                      {getDistanceText()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Virtual Hugs Section */}
            <div className="bg-card/70 border border-border/50 backdrop-blur-md rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2 mb-6">
                <Heart className="w-4 h-4 text-primary fill-primary animate-pulse-soft" /> Virtual Hug Jar
              </h3>

              {hugsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-card border border-border/50 text-center shadow-xs">
                    <p className="text-3xl font-black text-primary">{hugs?.myHugs || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Hugs I Sent</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-card border border-border/50 text-center shadow-xs">
                    <p className="text-3xl font-black text-secondary">{hugs?.partnerHugs || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Hugs Received</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSendHug}
                disabled={sendHugMutation.isPending}
                className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 group"
              >
                <Heart className="w-4.5 h-4.5 fill-white group-hover:scale-125 transition-transform" />
                <span>Send a Virtual Hug!</span>
              </button>
            </div>

            {/* Quick Interactions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link 
                href="/letters/new"
                className="flex items-center justify-between p-5 rounded-2xl bg-card/70 border border-border/50 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Write a Love Letter</h4>
                    <p className="text-[10px] text-muted-foreground">Seal your thoughts forever</p>
                  </div>
                </div>
                <span className="text-primary font-black group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link 
                href="/journal"
                className="flex items-center justify-between p-5 rounded-2xl bg-card/70 border border-border/50 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Couple Journal</h4>
                    <p className="text-[10px] text-muted-foreground">Document daily sweet moments</p>
                  </div>
                </div>
                <span className="text-secondary font-black group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
