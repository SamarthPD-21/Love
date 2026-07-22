"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  User,
  Mail,
  Calendar,
  MapPin,
  Sparkles,
  Loader2,
  Edit3,
  Save,
  X,
  Compass,
  CloudSun,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToastStore } from "@/stores/useToastStore";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { PageTransition } from "@/components/animations/PageTransition";
import { cn, daysBetween } from "@/lib/utils";

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  emoji: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { playSound } = useSoundEffects();
  const showToast = useToastStore((s) => s.showToast);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string[]>([]);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [isSavingAnniversary, setIsSavingAnniversary] = useState(false);

  // Fetch current user (me) populated with partner and relationship info
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data.user;
    },
  });

  // Fetch hugs count
  const { data: hugsData, isLoading: hugsLoading } = useQuery({
    queryKey: ["hugs"],
    queryFn: async () => {
      const res = await api.get("/users/hugs");
      return res.data;
    },
  });

  // Initialize edit fields
  useEffect(() => {
    if (profileData) {
      Promise.resolve().then(() => {
        setEditName(profileData.name || "");
        setEditAvatar(profileData.avatar ? [profileData.avatar] : []);
        
        const rel = profileData.relationshipId;
        if (rel && typeof rel === "object" && "startDate" in rel) {
          setAnniversaryDate(format(new Date(rel.startDate as string), "yyyy-MM-dd"));
        }
      });
    }
  }, [profileData]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; avatar?: string }) => {
      const res = await api.put("/users/me", payload);
      return res.data.user;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      setIsEditing(false);
      playSound("chime");
      showToast("Profile details updated successfully!", "success");
    },
  });

  // ── Batched hug sending ──────────────────────────────────────
  const pendingHugsRef = useRef(0);
  const hugFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHugFlushing = useRef(false);

  const flushHugs = useCallback(async () => {
    const count = pendingHugsRef.current;
    if (count === 0 || isHugFlushing.current) return;

    pendingHugsRef.current = 0;
    isHugFlushing.current = true;

    try {
      await api.post("/users/hugs", { count });
      queryClient.invalidateQueries({ queryKey: ["hugs"] });
      showToast(`Sent ${count} warm hug${count > 1 ? "s" : ""} to your partner! 🫂`, "success");
    } catch (e) {
      console.error("Failed to flush batched hugs:", e);
    } finally {
      isHugFlushing.current = false;
      if (pendingHugsRef.current > 0) {
        hugFlushTimerRef.current = setTimeout(flushHugs, 600);
      }
    }
  }, [queryClient, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hugFlushTimerRef.current) clearTimeout(hugFlushTimerRef.current);
      if (pendingHugsRef.current > 0) {
        const count = pendingHugsRef.current;
        pendingHugsRef.current = 0;
        api.post("/users/hugs", { count }).catch(() => {});
      }
    };
  }, []);

  const updateRelationshipMutation = useMutation({
    mutationFn: async (startDate: string) => {
      const res = await api.put("/relationship", { startDate });
      return res.data.relationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-me"] });
      playSound("chime");
      showToast("Anniversary date synchronized successfully!", "success");
    },
  });

  // Location Refresh Trigger
  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }

    setUpdatingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await api.put("/location", { lat: latitude, lng: longitude });
          queryClient.invalidateQueries({ queryKey: ["user-me"] });
          setLocationSharing(true);
          playSound("tap");
          showToast("GPS coordinates refreshed and synchronized!", "success");
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          const errMsg = err.response?.data?.error || "Failed to update location";
          setLocationError(errMsg);
          showToast(errMsg, "error");
        } finally {
          setUpdatingLocation(false);
        }
      },
      (err) => {
        const errMsg = "Permission denied or location unavailable";
        setLocationError(errMsg);
        showToast(errMsg, "error");
        setUpdatingLocation(false);
      }
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateProfileMutation.mutate({
      name: editName,
      avatar: editAvatar[0] || "",
    });
  };

  const handleSaveAnniversary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anniversaryDate) return;

    setIsSavingAnniversary(true);
    updateRelationshipMutation.mutate(anniversaryDate, {
      onSettled: () => setIsSavingAnniversary(false),
    });
  };

  const handleSendHug = () => {
    playSound("heartbeat");

    // Accumulate into batch
    pendingHugsRef.current += 1;

    // Trigger local floating particle explosions (capped to avoid lag)
    const emojis = ["❤️", "💖", "🫂", "✨", "🌸", "💕"];
    const particleCount = pendingHugsRef.current <= 3 ? 8 : 3; // fewer particles on rapid taps
    const newHearts = Array.from({ length: particleCount }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 260,
      y: -100 - Math.random() * 160,
      scale: 0.6 + Math.random() * 0.9,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));

    setHearts((prev) => {
      const combined = [...prev, ...newHearts];
      // Cap total heart particles to 30 to prevent DOM bloat
      return combined.length > 30 ? combined.slice(-30) : combined;
    });

    // Reset the debounce timer
    if (hugFlushTimerRef.current) clearTimeout(hugFlushTimerRef.current);
    hugFlushTimerRef.current = setTimeout(flushHugs, 600);
  };

  // Clean up heart particles after animation finishes
  useEffect(() => {
    if (hearts.length > 0) {
      const timer = setTimeout(() => {
        setHearts([]);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [hearts]);

  if (profileLoading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const partner = profileData?.partnerId;
  const relationship = profileData?.relationshipId;
  const relationshipStart = relationship?.startDate || profileData?.createdAt;
  const togetherDays = relationshipStart ? daysBetween(new Date(relationshipStart), new Date()) : 0;

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-6rem)] pb-12 max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Title Banner */}
        <div className="mb-10 text-center sm:text-left relative py-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent blur-3xl rounded-3xl" />
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display flex items-center justify-center sm:justify-start gap-2 relative">
            Profile Space <Heart className="w-6 h-6 text-primary fill-primary animate-pulse-soft" />
          </h1>
          <p className="mt-2 text-muted-foreground text-sm max-w-xl">
            Customize how your partner sees you, exchange virtual hugs, and update your anniversary settings.
          </p>
        </div>

        {/* Twin Profile Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Your Profile Card */}
          <motion.div
            className="card-cozy p-6 sm:p-8 flex flex-col justify-between"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-extrabold uppercase tracking-widest text-xs">My Profile</span>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      playSound("tap");
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile Photo</label>
                    <ImageUpload
                      value={editAvatar}
                      onChange={(urls) => setEditAvatar(urls)}
                      maxFiles={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-muted/50 border border-border/80 focus:border-primary focus:outline-none transition-all font-semibold"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 py-2 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSound("tap");
                        setIsEditing(false);
                        setEditName(profileData.name || "");
                        setEditAvatar(profileData.avatar ? [profileData.avatar] : []);
                      }}
                      className="px-4 py-2 border border-border hover:bg-muted/50 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center sm:items-start sm:flex-row gap-5">
                  {/* Avatar Frame */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary bg-primary/10 shadow-md">
                      {profileData.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileData.avatar} alt={profileData.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-primary text-2xl">
                          {profileData.name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile info details */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <h3 className="text-xl font-extrabold text-foreground">{profileData.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {profileData.email}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Joined Space: {format(new Date(profileData.createdAt), "MMMM d, yyyy")}</span>
                      </div>
                      
                      {profileData.lastLocation?.updatedAt && (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate max-w-[220px]">
                            Last active coords: {profileData.lastLocation.lat.toFixed(3)}, {profileData.lastLocation.lng.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Geolocation Refresh panel */}
            <div className="mt-8 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">GPS Location Sharing</span>
                <p className="text-xs text-muted-foreground mt-0.5">Let your partner see how far apart you are.</p>
              </div>
              <button
                onClick={handleRefreshLocation}
                disabled={updatingLocation}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 border border-border/80 hover:border-primary/30 transition-all font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {updatingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Compass className="w-3.5 h-3.5 text-primary" />
                )}
                Sync Coordinates
              </button>
            </div>
            {locationError && (
              <p className="text-xs text-destructive mt-2 text-center sm:text-left">{locationError}</p>
            )}
          </motion.div>

          {/* Partner Profile Card */}
          <motion.div
            className="card-cozy p-6 sm:p-8 flex flex-col justify-between"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div>
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-secondary fill-secondary animate-pulse-soft" />
                  <span className="font-bold uppercase tracking-widest text-xs">My Partner</span>
                </div>
                {partner && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                  </span>
                )}
              </div>

              {partner ? (
                <div className="flex flex-col items-center sm:items-start sm:flex-row gap-5">
                  {/* Avatar Frame */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-secondary bg-secondary/10 shadow-md">
                      {partner.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-secondary text-2xl">
                          {partner.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile info details */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <h3 className="text-xl font-extrabold text-foreground">{partner.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                        <Mail className="w-3.5 h-3.5 shrink-0" /> {partner.email}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Joined Space: {format(new Date(partner.createdAt), "MMMM d, yyyy")}</span>
                      </div>
                      
                      {partner.lastLocation?.updatedAt ? (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="truncate max-w-[220px]">
                            Last sync: {format(new Date(partner.lastLocation.updatedAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground italic">
                          <Compass className="w-3.5 h-3.5 shrink-0" /> No location sharing active
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-14 h-14 bg-muted/60 dark:bg-muted/40 rounded-2xl flex items-center justify-center border border-border/50 text-muted-foreground mb-4">
                    +
                  </div>
                  <h4 className="text-sm font-extrabold text-foreground">No partner connected yet</h4>
                  <p className="text-xs text-muted-foreground max-w-[240px] mt-1.5">
                    Share your invite code or register using your partner&apos;s code in settings.
                  </p>
                </div>
              )}
            </div>

            {/* Cozy footer row */}
            {partner && (
              <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span>Space Status: Active</span>
                <span className="font-extrabold text-primary animate-pulse-soft">💖 Connected Live</span>
              </div>
            )}
          </motion.div>

        </div>

        {/* Cozy Hugs Station Card */}
        <motion.div
          className="card-cozy p-8 text-center relative overflow-hidden mb-10 border border-primary/10 shadow-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/5 blur-2xl rounded-full" />

          {/* Title row */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              🫂
            </div>
            <span className="font-black uppercase tracking-widest text-xs text-muted-foreground">Virtual Hug Station</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Hugs Exchanged
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Send a silent warm hug to your partner. They will see the counter update live on their space!
          </p>

          {/* Exploding heart particle container */}
          <div className="relative h-16 w-32 mx-auto flex items-center justify-center">
            <AnimatePresence>
              {hearts.map((h) => (
                <motion.span
                  key={h.id}
                  className="absolute text-3xl select-none pointer-events-none filter drop-shadow-sm"
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: h.scale, x: h.x, y: h.y }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  {h.emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Symmetrical split counter displays */}
          {hugsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 max-w-xs mx-auto gap-4 mb-6">
              <div className="p-3 bg-muted/50 rounded-2xl border border-border/40 shadow-inner">
                <span className="text-3xl font-black text-primary tabular-nums">
                  {hugsData?.myHugs || 0}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mt-1.5 block">
                  Sent By Me
                </span>
              </div>
              <div className="p-3 bg-muted/50 rounded-2xl border border-border/40 shadow-inner">
                <span className="text-3xl font-black text-secondary tabular-nums">
                  {hugsData?.partnerHugs || 0}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mt-1.5 block">
                  Sent By Partner
                </span>
              </div>
            </div>
          )}

          {/* Pulse Launcher Button */}
          <motion.button
            onClick={handleSendHug}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <span>🫂</span> Send a Hug!
          </motion.button>
        </motion.div>

        {/* Anniversary Setting Manager */}
        <motion.div
          className="card-cozy p-6 sm:p-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center gap-2 border-b border-border/40 pb-4 mb-6">
            <Sparkles className="w-4.5 h-4.5 text-primary fill-primary animate-pulse-soft" />
            <span className="font-extrabold uppercase tracking-widest text-xs">Relationship Milestone settings</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-foreground">Anniversary Milestone Date</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Updating this date changes the anniversary milestones and the &ldquo;Days Together&rdquo; countdown shown across the application.
              </p>
            </div>

            <form onSubmit={handleSaveAnniversary} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <input
                type="date"
                value={anniversaryDate}
                onChange={(e) => setAnniversaryDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-muted/50 border border-border/80 focus:border-primary focus:outline-none transition-all font-semibold text-sm cursor-pointer"
                required
              />
              <button
                type="submit"
                disabled={isSavingAnniversary}
                className="w-full sm:w-auto px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSavingAnniversary ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Update Date
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <span>Current anniversary: {relationshipStart ? format(new Date(relationshipStart), "MMMM d, yyyy") : "Not set"}</span>
            <span className="font-extrabold text-primary">{togetherDays} beautiful days shared together ❤️</span>
          </div>
        </motion.div>

      </div>
    </PageTransition>
  );
}
